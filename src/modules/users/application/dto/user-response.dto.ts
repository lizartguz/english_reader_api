import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@/common/enums/domain.enums';

/** Representación administrativa de un usuario, sin datos sensibles. */
export class UserAdminResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin@englishreader.local' })
  email!: string;

  @ApiProperty({ example: 'Ana' })
  firstName!: string;

  @ApiProperty({ example: 'García' })
  lastName!: string;

  @ApiProperty({ example: 'Ana García' })
  fullName!: string;

  @ApiPropertyOptional({ nullable: true })
  phoneNumber!: string | null;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ type: [String], example: ['ADMIN'] })
  roles!: string[];

  @ApiProperty({ type: [String] })
  permissions!: string[];

  @ApiPropertyOptional({ nullable: true })
  emailVerifiedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
