import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MemberService } from './member.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('会员订阅')
@Controller('member')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MemberController {
  constructor(private memberService: MemberService) {}

  @Get('subscription')
  @ApiOperation({ summary: '获取当前订阅信息与配额余量' })
  async getSubscription(@Request() req) {
    return this.memberService.getSubscriptionInfo(req.user.userId);
  }

  @Get('plans')
  @ApiOperation({ summary: '获取全部套餐（供前端展示升级选项）' })
  listPlans() {
    return this.memberService.listPlans();
  }

  @Post('upgrade')
  @ApiOperation({ summary: '升级套餐（支付网关未接入时模拟支付并直接激活）' })
  async upgrade(
    @Request() req,
    @Body() body: { plan: string; paymentMethod?: 'WECHAT' | 'ALIPAY' },
  ) {
    const userId = req.user.userId;
    const paymentMethod = body.paymentMethod || 'WECHAT';
    const order = await this.memberService.createUpgradeOrder(userId, body.plan, paymentMethod);

    // 支付网关接入前：createUpgradeOrder 返回 mockPaid=true，直接激活
    if (order.mockPaid) {
      await this.memberService.activate(
        userId,
        order.plan,
        paymentMethod,
        order.amount,
        order.orderId,
      );
    }

    // TODO: 接入微信支付后，此处应仅返回预支付参数，由支付回调 paymentCallback 调 activate
    return {
      ...order,
      subscription: await this.memberService.getSubscriptionInfo(userId),
    };
  }

  @Post('cancel-auto-renew')
  @ApiOperation({ summary: '取消自动续费' })
  async cancelAutoRenew(@Request() req) {
    await this.memberService.cancelAutoRenew(req.user.userId);
    return { message: '已取消自动续费' };
  }
}
