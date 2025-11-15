import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateUserDto, ChangePasswordDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, requestingUserId: string, requestingUserRole: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only super admin, owner, or the user themselves can update
    if (
      id !== requestingUserId &&
      requestingUserRole !== 'SUPER_ADMIN' &&
      requestingUserRole !== 'OWNER'
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        tenantId: true,
      },
    });

    return updatedUser;
  }

  async delete(id: string, requestingUserRole: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (requestingUserRole !== 'SUPER_ADMIN' && requestingUserRole !== 'OWNER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.user.delete({ where: { id } });

    return { message: 'User deleted successfully' };
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
    requestingUserId: string,
    requestingUserRole: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only super admin or the user themselves can change password
    if (id !== requestingUserId && requestingUserRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot change another user\'s password');
    }

    // Verify current password (not required for super admin)
    if (id === requestingUserId) {
      const isPasswordValid = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.password,
      );

      if (!isPasswordValid) {
        throw new BadRequestException('Invalid current password');
      }
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }
}
