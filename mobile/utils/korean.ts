/**
 * @file utils/korean.ts
 * @description 한국어 조사 처리.
 *
 * DESIGN.md: "조사는 앞 글자에 맞춰 미리 확정한 문자열로 쓰고 런타임에서
 * 조합하지 않는다." 그 원칙의 예외가 **부위·종목 이름처럼 값이 실행 중에
 * 정해지는 자리**다. 미리 확정할 수가 없어 받침을 보고 고른다.
 */

/**
 * 받침 유무에 따라 '은' 또는 '는'을 고른다.
 *
 * 한글 음절은 0xAC00부터 (초성×21 + 중성)×28 + 종성 으로 배열된다.
 * 28로 나눈 나머지가 종성 인덱스이고 0이면 받침이 없다.
 * 한글이 아닌 글자로 끝나면(영문·숫자) '는'으로 둔다.
 */
export function eunNeun(s: string): string {
  const code = s.charCodeAt(s.length - 1) - 0xac00;
  return code >= 0 && code % 28 !== 0 ? '은' : '는';
}
