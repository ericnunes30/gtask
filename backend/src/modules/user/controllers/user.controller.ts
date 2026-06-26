import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    const createUser = this.userService.create(createUserDto);
    return createUser;
  }

  @Get()
  findAll() {
    const getAllUsers = this.userService.findAll();
    return getAllUsers;
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const getUser = this.userService.findOne(id);
    return getUser;
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updateUser = this.userService.update(id, updateUserDto);
    return updateUser;
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    const deleteUser = this.userService.remove(id);
    return deleteUser;
  }

  @Get('search/:email')
  findByEmail(@Param('email') email: string) {
    const searchEmailUser = this.userService.findByEmail(email);
    return searchEmailUser;
  }

  @Post(':id/assign-roles')
  assignRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body('roleIds') roleIds: number[],
  ) {
    const searchPermissionsUser = this.userService.assignRoles(id, roleIds);
    return searchPermissionsUser;
  }

  @Post(':id/assign-occupations')
  assignOccupations(
    @Param('id', ParseIntPipe) id: number,
    @Body('occupationIds') occupationIds: number[],
  ) {
    const assignOccupations = this.userService.assignOccupations(
      id,
      occupationIds,
    );
    return assignOccupations;
  }
}
