import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './favorite.entity';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite)
    private favoriteRepo: Repository<Favorite>,
  ) {}

  async getAll(userId: string): Promise<Favorite[]> {
    return this.favoriteRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async add(userId: string, data: any): Promise<Favorite> {
    const existing = await this.favoriteRepo.findOne({
      where: { user: { id: userId }, foodName: data.foodName },
    });
    if (existing) return existing;
    const fav = this.favoriteRepo.create({ ...data, user: { id: userId } });
    return this.favoriteRepo.save(fav) as unknown as Favorite;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.favoriteRepo.delete({ id, user: { id: userId } });
  }
}