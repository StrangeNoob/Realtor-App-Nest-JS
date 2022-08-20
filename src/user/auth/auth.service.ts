import { Injectable, ConflictException, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UserType } from '@prisma/client';

interface SignUpParams {
  email: string;
  password: string;
  name: string;
  phone: string;
}
interface SignInParams {
  email: string;
  password: string;
}
@Injectable()
export class AuthService {
  constructor(private readonly prismaService: PrismaService) {}
  async signup(
    { email, password, phone, name }: SignUpParams,
    userType: UserType,
  ) {
    const userExits = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (userExits) {
      throw new ConflictException('User already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await this.prismaService.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        user_type: userType,
      },
    });
    const token = this.generateToken(createdUser.id, createdUser.email);
    return token;
  }

  async signin({ email, password }: SignInParams) {
    const userExits = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (userExits) {
      throw new HttpException('Invalid Credentials', 400);
    }

    const isValidate = await bcrypt.compare(password, userExits.password);
    if (!isValidate) {
      throw new HttpException('Invalid Credentials', 400);
    }
    const token = this.generateToken(userExits.id, userExits.email);
    return token;
  }

  generateToken(id: number, email: string) {
    const token = jwt.sign(
      {
        id,
        email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '5d',
      },
    );
    return token;
  }
  generateProductKey(email: string, userType: UserType) {
    const key = `${email}-${userType}-${process.env.PRODUCT_KEY_SECRET}`;
    return bcrypt.hash(key, 10);
  }
}
