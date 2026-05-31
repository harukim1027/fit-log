import { Injectable, HttpException, HttpStatus, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CustomFood } from './custom_food.entity';

@Injectable()
export class FoodService {
  private koApiKey: string;

  constructor(
    private config: ConfigService,
    @InjectRepository(CustomFood)
    private customFoodRepo: Repository<CustomFood>,
  ) {
    this.koApiKey = config.get('FOOD_KO_API_KEY') || '';
  }

  async search(query: string, page = 1, userId?: string) {
    const isKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(query);
    const [dbResults, customResults] = await Promise.all([
      isKorean ? this.searchKorean(query, page) : this.searchGlobal(query, page),
      this.searchCustomFoods(query, userId),
    ]);
    return [...customResults, ...dbResults];
  }

  private async searchCustomFoods(query: string, userId?: string) {
    const where: any[] = [{ foodName: ILike(`%${query}%`), isPublic: true }];
    if (userId) {
      where.push({ foodName: ILike(`%${query}%`), userId });
    }
    const foods = await this.customFoodRepo.find({ where, order: { createdAt: 'DESC' } });
    const seen = new Set<string>();
    const result: any[] = [];
    for (const f of foods) {
      const key = f.id;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        id: `custom-${f.id}`,
        name: f.foodName,
        brand: '',
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        servingSize: `${f.amount}${f.unit}`,
        source: f.userId === userId ? 'my' : 'custom',
        customFoodId: f.id,
        isPublic: f.isPublic,
        copyCount: f.copyCount,
      });
    }
    return result;
  }

  private cleanFoodName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private mapKoItem(item: any) {
    return {
      id: item.FOOD_CD || String(Math.random()),
      name: this.cleanFoodName(item.FOOD_NM_KR || '알 수 없음'),
      brand: item.MAKER_NM || '',
      calories: Math.round(parseFloat(item.AMT_NUM1) || 0),
      protein: Math.round((parseFloat(item.AMT_NUM3) || 0) * 10) / 10,
      carbs: Math.round((parseFloat(item.AMT_NUM6) || 0) * 10) / 10,
      fat: Math.round((parseFloat(item.AMT_NUM4) || 0) * 10) / 10,
      servingSize: item.SERVING_SIZE || '100g',
      source: 'db' as const,
    };
  }

  private async searchKorean(query: string, page: number) {
    try {
      const url = `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02?serviceKey=${this.koApiKey}&pageNo=${page}&numOfRows=20&type=json&FOOD_NM_KR=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      const items = data?.body?.items || [];
      if (!Array.isArray(items)) return [];
      return items.map((item: any) => this.mapKoItem(item));
    } catch (e) {
      console.error('한국 식품 검색 오류:', e);
      throw new HttpException('한국 식품 검색 중 오류가 발생했어요', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async searchGlobal(query: string, page: number) {
    try {
      const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
      url.searchParams.set('search_terms', query);
      url.searchParams.set('search_simple', '1');
      url.searchParams.set('action', 'process');
      url.searchParams.set('json', '1');
      url.searchParams.set('page', String(page));
      url.searchParams.set('page_size', '20');
      url.searchParams.set('fields', 'id,product_name,nutriments,serving_size,brands');
      const res = await fetch(url.toString());
      const data = await res.json();
      return (data.products || []).map((p: any) => ({
        id: p.id,
        name: p.product_name || '알 수 없음',
        brand: p.brands || '',
        calories: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
        protein: Math.round((p.nutriments?.proteins_100g || 0) * 10) / 10,
        carbs: Math.round((p.nutriments?.carbohydrates_100g || 0) * 10) / 10,
        fat: Math.round((p.nutriments?.fat_100g || 0) * 10) / 10,
        servingSize: p.serving_size || '100g',
        source: 'db' as const,
      }));
    } catch {
      throw new HttpException('식품 검색 중 오류가 발생했어요', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getByBarcode(barcode: string) {
    try {
      const res = await fetch('https://world.openfoodfacts.org/api/v2/product/' + barcode + '.json');
      const data = await res.json();
      if (data.status !== 1) throw new HttpException('제품을 찾을 수 없어요', HttpStatus.NOT_FOUND);
      const p = data.product;
      return {
        id: p.id,
        name: p.product_name || '알 수 없음',
        brand: p.brands || '',
        calories: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
        protein: Math.round((p.nutriments?.proteins_100g || 0) * 10) / 10,
        carbs: Math.round((p.nutriments?.carbohydrates_100g || 0) * 10) / 10,
        fat: Math.round((p.nutriments?.fat_100g || 0) * 10) / 10,
        servingSize: p.serving_size || '100g',
      };
    } catch {
      throw new HttpException('바코드 조회 중 오류가 발생했어요', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async analyzeImage(base64: string): Promise<any> {
    const apiKey = this.config.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new HttpException('API 키가 설정되지 않았어요', HttpStatus.INTERNAL_SERVER_ERROR);

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
          },
          {
            type: 'text',
            text: '이 음식 사진을 분석해서 음식명, 예상 칼로리, 탄수화물, 단백질, 지방을 JSON으로 반환해줘. 100g 기준으로. 반드시 JSON만 반환해 (마크다운 없이). 형식: {"name":"음식명","calories":숫자,"carbs":숫자,"protein":숫자,"fat":숫자,"amount":100,"unit":"g"}',
          },
        ],
      }],
    };

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data: any = await res.json();
      const text: string = data?.content?.[0]?.text ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('JSON 파싱 실패');
      return JSON.parse(match[0]);
    } catch {
      throw new HttpException('음식 분석 중 오류가 발생했어요', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // --- Custom food CRUD ---

  async createCustomFood(userId: string, dto: {
    foodName: string; calories: number; protein: number;
    carbs: number; fat: number; amount: number; unit: string; isPublic?: boolean;
  }): Promise<CustomFood> {
    const food = this.customFoodRepo.create({ ...dto, userId, isPublic: dto.isPublic ?? false });
    return this.customFoodRepo.save(food);
  }

  async getMyCustomFoods(userId: string): Promise<CustomFood[]> {
    return this.customFoodRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateCustomFood(userId: string, id: string, dto: Partial<{
    foodName: string; calories: number; protein: number;
    carbs: number; fat: number; amount: number; unit: string; isPublic: boolean;
  }>): Promise<CustomFood> {
    const food = await this.customFoodRepo.findOne({ where: { id } });
    if (!food) throw new NotFoundException('식품을 찾을 수 없어요');
    if (food.userId !== userId) throw new ForbiddenException('권한이 없어요');
    Object.assign(food, dto);
    return this.customFoodRepo.save(food);
  }

  async deleteCustomFood(userId: string, id: string): Promise<void> {
    const food = await this.customFoodRepo.findOne({ where: { id } });
    if (!food) throw new NotFoundException('식품을 찾을 수 없어요');
    if (food.userId !== userId) throw new ForbiddenException('권한이 없어요');
    await this.customFoodRepo.remove(food);
  }

  async copyCustomFood(userId: string, id: string): Promise<CustomFood> {
    const original = await this.customFoodRepo.findOne({ where: { id } });
    if (!original) throw new NotFoundException('식품을 찾을 수 없어요');
    if (!original.isPublic) throw new ForbiddenException('공개된 식품만 가져올 수 있어요');
    original.copyCount += 1;
    await this.customFoodRepo.save(original);
    const copy = this.customFoodRepo.create({
      foodName: original.foodName,
      calories: original.calories,
      protein: original.protein,
      carbs: original.carbs,
      fat: original.fat,
      amount: original.amount,
      unit: original.unit,
      isPublic: false,
      userId,
    });
    return this.customFoodRepo.save(copy);
  }
}
