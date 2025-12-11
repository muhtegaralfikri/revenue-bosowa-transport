import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Nama pengguna yang tampil di aplikasi' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Email unik pengguna' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password awal user (minimal 8 karakter)' })
  @IsString()
  @MinLength(8)
  password: string;
}
