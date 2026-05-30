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
    if (isKorean) return this.searchKorean(query, page);
    return this.searchGlobal(query, page);
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
}
