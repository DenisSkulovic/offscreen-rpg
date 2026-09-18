import { Controller, Get } from '@nestjs/common';
import { storytellerCatalogue } from '@offscreen/ai/storytellers';

@Controller('storytellers')
export class StorytellersController {
  @Get()
  list() {
    return { items: storytellerCatalogue.list() };
  }
}
