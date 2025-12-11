import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RevenueService } from './revenue.service';
import { CreateRealizationDto } from './dto/create-realization.dto';
import { CreateTargetDto } from './dto/create-target.dto';
import { RevenueQueryDto } from './dto/revenue-query.dto';

@ApiTags('Revenue')
@Controller('revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  // === Companies ===
  @Get('companies')
  @ApiOperation({ summary: 'Get all active companies' })
  getAllCompanies() {
    return this.revenueService.getAllCompanies();
  }

  @Post('companies/seed')
  @ApiOperation({ summary: 'Seed default companies' })
  seedCompanies() {
    return this.revenueService.seedCompanies();
  }

  // === Targets ===
  @Post('targets')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update monthly target' })
  createTarget(@Body() dto: CreateTargetDto) {
    return this.revenueService.createTarget(dto);
  }

  @Get('targets')
  @ApiOperation({ summary: 'Get targets by year/month' })
  getTargets(@Query() query: RevenueQueryDto) {
    return this.revenueService.getTargets(query);
  }

  // === Realizations ===
  @Post('realizations')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update daily realization' })
  createRealization(@Body() dto: CreateRealizationDto, @Request() req) {
    return this.revenueService.createRealization(dto, req.user?.sub);
  }

  @Get('realizations')
  @ApiOperation({ summary: 'Get realizations by year/month' })
  getRealizations(@Query() query: RevenueQueryDto) {
    return this.revenueService.getRealizations(query);
  }

  // === Summary & Trend ===
  @Get('summary')
  @ApiOperation({ summary: 'Get revenue summary for dashboard' })
  getSummary(@Query() query: RevenueQueryDto) {
    return this.revenueService.getSummary(query);
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get daily trend for chart' })
  getTrend(@Query() query: RevenueQueryDto) {
    return this.revenueService.getTrend(query);
  }

  @Get('yearly-comparison')
  @ApiOperation({ summary: 'Get yearly comparison (12 months) for chart' })
  getYearlyComparison(@Query('year') year?: number) {
    return this.revenueService.getYearlyComparison(year);
  }
}
