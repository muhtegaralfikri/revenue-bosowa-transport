// /backend/src/stock/stock.controller.ts

// Tambahkan 'Request'
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  SetMetadata,
  Request,
  Query, // <-- TAMBAHKAN INI
} from '@nestjs/common';
import { PaginationDto } from '../common/dto/pagination.dto';
import { StockService } from './stock.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { CreateStockInDto } from './dto/create-stock-in.dto';
import { CreateStockOutDto } from './dto/create-stock-out.dto';

@ApiTags('stock')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('summary')
  getSummary() {
    // Tidak berubah
    return this.stockService.getSummary();
  }

  @Post('in')
  @ApiBearerAuth()
  @SetMetadata('roles', ['admin'])
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  // Tambahkan '@Request() req'
  addStock(@Body() createStockInDto: CreateStockInDto, @Request() req) { 
    // Kirim 'req.user' ke service
    return this.stockService.addStockIn(createStockInDto, req.user); 
  }

  @Post('out')
  @ApiBearerAuth()
  @SetMetadata('roles', ['operasional'])
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  // Tambahkan '@Request() req'
  useStock(@Body() createStockOutDto: CreateStockOutDto, @Request() req) {
    // Kirim 'req.user' ke service
    return this.stockService.useStockOut(createStockOutDto, req.user);
  }

  @Get('history')
  @ApiBearerAuth() // Butuh token
  @SetMetadata('roles', ['admin']) // Hanya 'admin'
  @UseGuards(AuthGuard('jwt'), RolesGuard) // Terapkan penjaga
  getHistory(
    @Query() paginationDto: PaginationDto, // <-- Ambil query params
  ) {
    return this.stockService.getHistory(paginationDto);
  }
}