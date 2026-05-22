import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FoodService {
  private baseUrl: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('OPEN_FOOD_FACTS_BASE_URL') || 'https://world.openfoodfacts.org/api/v2';
  }

  async search(query: string, page = 1) {
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

      return data.products.map((p: any) => ({
        id: p.id,
        name: p.product_name || '알 수 없음',
        brand: p.brands || '',
        calories: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
        protein: Math.round((p.nutriments?.proteins_100g || 0) * 10) / 10,
        carbs: Math.round((p.nutriments?.carbohydrates_100g || 0) * 10) / 10,
        fat: Math.round((p.nutriments?.fat_100g || 0) * 10) / 10,
        servingSize: p.serving_size || '100g',
      }));
    } catch {
      throw new HttpException('식품 검색 중 오류가 발생했어요', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getByBarcode(barcode: string) {
    try {
      const res = await fetch(this.baseUrl + '/product/' + barcode + '.json');
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
}