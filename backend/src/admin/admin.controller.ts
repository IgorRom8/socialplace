import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminLoginDto } from '../dto/admin-login.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    const result = this.adminService.login(dto.login, dto.password);
    if (!result) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }
    return result;
  }

  @Delete('posts/:postId')
  @UseGuards(AdminGuard)
  deletePost(@Param('postId') postId: string) {
    return this.adminService.deletePost(postId);
  }

  @Delete('comments/:commentId')
  @UseGuards(AdminGuard)
  deleteComment(@Param('commentId') commentId: string) {
    return this.adminService.deleteComment(commentId);
  }

  @Post('users/:userId/ban')
  @UseGuards(AdminGuard)
  banUser(@Param('userId') userId: string) {
    return this.adminService.banUser(userId);
  }

  @Post('users/:userId/unban')
  @UseGuards(AdminGuard)
  unbanUser(@Param('userId') userId: string) {
    return this.adminService.unbanUser(userId);
  }
}
