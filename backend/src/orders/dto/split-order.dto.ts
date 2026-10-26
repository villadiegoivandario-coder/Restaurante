import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class SplitOrderDto {
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(30)
  partsCount!: number;
}
