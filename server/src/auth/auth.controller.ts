import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login/phone')
  @ApiOperation({ summary: '手机号登录' })
  loginByPhone(@Body() body: { phone: string }) {
    return this.authService.loginByPhone(body.phone);
  }

  @Post('login/password')
  @ApiOperation({ summary: '密码登录' })
  loginByPassword(@Body() body: { phone: string; password: string }) {
    return this.authService.loginByPassword(body.phone, body.password);
  }

  @Post('register')
  @ApiOperation({ summary: '注册' })
  register(@Body() body: { phone: string; password: string; nickname?: string }) {
    return this.authService.register(body.phone, body.password, body.nickname);
  }

  @Post('login/wechat')
  @ApiOperation({ summary: '微信登录' })
  loginByWechat(@Body() body: { openId: string; unionId?: string }) {
    return this.authService.loginByWechat(body.openId, body.unionId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  getProfile(@Request() req) {
    return this.authService.validateUser(req.user.userId);
  }
}
