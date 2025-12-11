export interface AuthenticatedUserDto {
  id: string;
  username: string;
  email: string;
}

export interface AuthSessionDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthenticatedUserDto;
}
