import { describe, expect, it } from 'vitest'
import { calculateAccuracy, calculateScore, commonPrefixLength, evaluateRoman, tokenizeReading } from './typing'

describe('IME確定後の比較に使う共通接頭辞', () => {
  it('改行を含む一致範囲を返す', () => expect(commonPrefixLength('件名：確認\n本文', '件名：確認\n別文')).toBe(6))
})

describe('ローマ字入力', () => {
  it('shi と si の両方を認める', () => {
    expect(evaluateRoman('shi', 'し').complete).toBe(true)
    expect(evaluateRoman('si', 'し').complete).toBe(true)
  })
  it('促音を子音の重ね打ちで認める', () => expect(evaluateRoman('kitte', 'きって').complete).toBe(true))
  it('句読点と長音を扱う', () => expect(evaluateRoman('me-ru,', 'めーる、').complete).toBe(true))
  it('誤った綴りを拒否し次候補を返す', () => {
    const evaluation = evaluateRoman('sh', 'し')
    expect(evaluation.valid).toBe(true)
    expect(evaluation.next).toContain('i')
    expect(evaluateRoman('sx', 'し').valid).toBe(false)
  })
  it('読みデータを日本語表示から独立して分割する', () => expect(tokenizeReading('きょう').map((item) => item.kana)).toEqual(['きょ', 'う']))
})

describe('結果指標', () => {
  it('修正が増えると正確率と得点が下がる', () => {
    expect(calculateAccuracy(100, 10)).toBeLessThan(100)
    expect(calculateScore(100, 80, 60, 5)).toBeLessThan(calculateScore(100, 100, 60, 5))
  })
})
