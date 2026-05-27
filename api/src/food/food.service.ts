import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FoodService {
  private koApiKey: string;

  constructor(private config: ConfigService) {
    this.koApiKey = config.get('FOOD_KO_API_KEY') || '';
  }

  async search(query: string, page = 1) {
    const isKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(query);
    if (isKorean) {
      return this.searchKorean(query, page);
    }
    return this.searchGlobal(query, page);
  }

  private mapItem(item: any) {
    return {
      id: item.foodCd || String(Math.random()),
      name: item.foodNm || '알 수 없음',
      brand: item.mfrNm || item.restNm || '',
      calories: Math.round(parseFloat(item.enerc) || 0),
      protein: Math.round((parseFloat(item.prot) || 0) * 10) / 10,
      carbs: Math.round((parseFloat(item.chocdf) || 0) * 10) / 10,
      fat: Math.round((parseFloat(item.fatce) || 0) * 10) / 10,
      servingSize: item.nutConSrtrQua || '100g',
    };
  }

  private async searchKorean(query: string, page: number) {
    try {
      const [processRes, foodRes] = await Promise.all([
        fetch(`https://api.data.go.kr/openapi/tn_pubr_public_nutri_process_info_api?serviceKey=${this.koApiKey}&pageNo=${page}&numOfRows=10&type=json&foodNm=${encodeURIComponent(query)}`),
        fetch(`https://api.data.go.kr/openapi/tn_pubr_public_nutri_food_info_api?serviceKey=${this.koApiKey}&pageNo=${page}&numOfRows=10&type=json&foodNm=${encodeURIComponent(query)}`),
      ]);

      const [processData, foodData] = await Promise.all([
        processRes.json(),
        foodRes.json(),
      ]);

      const processItems = processData?.response?.body?.items || [];
      const foodItems = foodData?.response?.body?.items || [];

      const combined = [...processItems, ...foodItems];

      const seen = new Set<string>();
      const unique = combined.filter(item => {
        if (seen.has(item.foodCd)) return false;
        seen.add(item.foodCd);
        return true;
      });

      return unique.map(item => this.mapItem(item));
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
}
