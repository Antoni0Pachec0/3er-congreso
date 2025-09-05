import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nest/throttle';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';


import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-register.dto';
import { UpdateAuthDto } from './dto/update-register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // attempts, seconds
  @Throttle(50, 60)
  @Post('login')
  loginUser(@Body() CreateRegisterDto: AuthService){
    return this.authService.createUser(CreateRegisterDto);
  }

  @Post()
  create(@Body() createAuthDto: CreateAuthDto) { 
    return this.authService.create(createAuthDto);
  }

  @Get()
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}