import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DictionaryMessages } from '@/common/constants/messages.constants';
import { AppException } from '@/common/exceptions/app.exception';
import { LocalFileStorageService } from '@/modules/files/infrastructure/storage/local-file-storage.service';
import { PrismaService } from '@/database/prisma.service';
import { SystemLogWriterService } from '@/modules/system-logs/application/system-log-writer.service';
import { GetPronunciationAudioUseCase } from './get-pronunciation-audio.use-case';

jest.mock('axios');
const axiosMock = axios as jest.Mocked<typeof axios>;

describe('GetPronunciationAudioUseCase', () => {
  let prisma: { wordPronunciation: { findUnique: jest.Mock; update: jest.Mock } };
  let storage: jest.Mocked<LocalFileStorageService>;
  let systemLogWriter: jest.Mocked<SystemLogWriterService>;
  let useCase: GetPronunciationAudioUseCase;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = { wordPronunciation: { findUnique: jest.fn(), update: jest.fn() } };
    storage = {
      read: jest.fn(),
      storeBytes: jest.fn(),
    } as unknown as jest.Mocked<LocalFileStorageService>;
    systemLogWriter = {
      writeProviderFailure: jest.fn(),
    } as unknown as jest.Mocked<SystemLogWriterService>;

    const config = {
      get: (clave: string) => {
        if (clave === 'external.pronunciationAudioTimeoutMs') return 20000;
        if (clave === 'external.maxPronunciationAudioBytes') return 5 * 1024 * 1024;
        if (clave === 'external.pronunciationAudioHosts') return ['api.dictionaryapi.dev'];
        if (clave === 'external.dictionaryUrl') return 'https://api.dictionaryapi.dev/api/v2';
        return undefined;
      },
    } as unknown as ConfigService;

    useCase = new GetPronunciationAudioUseCase(
      prisma as unknown as PrismaService,
      storage,
      systemLogWriter,
      config,
    );
  });

  it('descarga el audio cuando el origen está permitido', async () => {
    prisma.wordPronunciation.findUnique.mockResolvedValue({
      audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3',
      audioStoragePath: null,
      audioMimeType: null,
    });
    axiosMock.get.mockResolvedValue({
      data: Buffer.from([1, 2, 3]),
      headers: { 'content-type': 'audio/mpeg' },
    });

    const audio = await useCase.execute('pron-1');

    expect(audio.mimeType).toBe('audio/mpeg');
    expect(audio.buffer.length).toBe(3);
  });

  it('no sigue redirecciones, que podrían sacar la descarga de la lista permitida', async () => {
    prisma.wordPronunciation.findUnique.mockResolvedValue({
      audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3',
      audioStoragePath: null,
      audioMimeType: null,
    });
    axiosMock.get.mockResolvedValue({
      data: Buffer.from([1]),
      headers: { 'content-type': 'audio/mpeg' },
    });

    await useCase.execute('pron-1');

    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ maxRedirects: 0 }),
    );
  });

  it('guarda una copia local la primera vez que se descarga', async () => {
    prisma.wordPronunciation.findUnique.mockResolvedValue({
      audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3',
      audioStoragePath: null,
      audioMimeType: null,
    });
    axiosMock.get.mockResolvedValue({
      data: Buffer.from([1, 2, 3]),
      headers: { 'content-type': 'audio/mpeg' },
    });

    await useCase.execute('pron-1');

    expect(storage.storeBytes).toHaveBeenCalledWith(
      'pronunciations/pron-1.audio',
      expect.any(Buffer),
    );
    expect(prisma.wordPronunciation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          audioStoragePath: 'pronunciations/pron-1.audio',
          audioMimeType: 'audio/mpeg',
        }),
      }),
    );
  });

  it('sirve la copia local sin volver a salir al proveedor', async () => {
    // Es el caso de un segundo usuario que consulta la misma palabra.
    prisma.wordPronunciation.findUnique.mockResolvedValue({
      audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3',
      audioStoragePath: 'pronunciations/pron-1.audio',
      audioMimeType: 'audio/mpeg',
    });
    storage.read.mockResolvedValue(Buffer.from([9, 9]));

    const audio = await useCase.execute('pron-1');

    expect(audio.buffer.length).toBe(2);
    expect(axiosMock.get).not.toHaveBeenCalled();
  });

  it('vuelve a descargar si el archivo cacheado ya no está en disco', async () => {
    prisma.wordPronunciation.findUnique.mockResolvedValue({
      audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3',
      audioStoragePath: 'pronunciations/pron-1.audio',
      audioMimeType: 'audio/mpeg',
    });
    storage.read.mockRejectedValue(new Error('ENOENT'));
    axiosMock.get.mockResolvedValue({
      data: Buffer.from([7]),
      headers: { 'content-type': 'audio/mpeg' },
    });

    const audio = await useCase.execute('pron-1');

    expect(audio.buffer.length).toBe(1);
    expect(axiosMock.get).toHaveBeenCalled();
  });

  it('rechaza un host fuera de la lista permitida', async () => {
    // La URL la guardó un proveedor externo: si sus datos se comprometieran,
    // este servidor no debe descargar de cualquier host.
    prisma.wordPronunciation.findUnique.mockResolvedValue({
      audioUrl: 'https://servidor-ajeno.example/pronunciacion.mp3',
      audioStoragePath: null,
      audioMimeType: null,
    });

    await expect(useCase.execute('pron-1')).rejects.toMatchObject({
      message: DictionaryMessages.AudioNotFound,
    });
    expect(axiosMock.get).not.toHaveBeenCalled();
  });

  it('rechaza esquemas que no sean HTTPS', async () => {
    prisma.wordPronunciation.findUnique.mockResolvedValue({
      audioUrl: 'http://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3',
      audioStoragePath: null,
      audioMimeType: null,
    });

    await expect(useCase.execute('pron-1')).rejects.toBeInstanceOf(AppException);
    expect(axiosMock.get).not.toHaveBeenCalled();
  });

  it('rechaza una respuesta que no sea audio', async () => {
    prisma.wordPronunciation.findUnique.mockResolvedValue({
      audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3',
      audioStoragePath: null,
      audioMimeType: null,
    });
    axiosMock.get.mockResolvedValue({
      data: Buffer.from('<html>'),
      headers: { 'content-type': 'text/html' },
    });

    await expect(useCase.execute('pron-1')).rejects.toMatchObject({
      message: DictionaryMessages.AudioUnavailable,
    });
  });

  it('responde no encontrado cuando la pronunciación no tiene audio', async () => {
    prisma.wordPronunciation.findUnique.mockResolvedValue({ audioUrl: null });

    await expect(useCase.execute('pron-1')).rejects.toMatchObject({
      message: DictionaryMessages.AudioNotFound,
    });
  });

  it('registra el fallo del proveedor sin filtrar la URL completa', async () => {
    prisma.wordPronunciation.findUnique.mockResolvedValue({
      audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3',
      audioStoragePath: null,
      audioMimeType: null,
    });
    axiosMock.get.mockRejectedValue(new Error('ECONNRESET'));

    await expect(useCase.execute('pron-1')).rejects.toMatchObject({
      message: DictionaryMessages.AudioUnavailable,
    });
    expect(systemLogWriter.writeProviderFailure).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { pronunciationId: 'pron-1', host: 'api.dictionaryapi.dev' },
    );
  });
});
