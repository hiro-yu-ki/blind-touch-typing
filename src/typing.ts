export type RomanEvaluation = {
  valid: boolean
  complete: boolean
  next: string[]
  canonical: string
}

const digraphs: Record<string, string[]> = {
  きゃ: ['kya'], きゅ: ['kyu'], きょ: ['kyo'], しゃ: ['sha', 'sya'], しゅ: ['shu', 'syu'], しょ: ['sho', 'syo'],
  ちゃ: ['cha', 'tya'], ちゅ: ['chu', 'tyu'], ちょ: ['cho', 'tyo'], にゃ: ['nya'], にゅ: ['nyu'], にょ: ['nyo'],
  ひゃ: ['hya'], ひゅ: ['hyu'], ひょ: ['hyo'], みゃ: ['mya'], みゅ: ['myu'], みょ: ['myo'],
  りゃ: ['rya'], りゅ: ['ryu'], りょ: ['ryo'], ぎゃ: ['gya'], ぎゅ: ['gyu'], ぎょ: ['gyo'],
  じゃ: ['ja', 'zya', 'jya'], じゅ: ['ju', 'zyu', 'jyu'], じょ: ['jo', 'zyo', 'jyo'],
  びゃ: ['bya'], びゅ: ['byu'], びょ: ['byo'], ぴゃ: ['pya'], ぴゅ: ['pyu'], ぴょ: ['pyo'],
}

const singles: Record<string, string[]> = {
  あ: ['a'], い: ['i'], う: ['u'], え: ['e'], お: ['o'],
  か: ['ka'], き: ['ki'], く: ['ku'], け: ['ke'], こ: ['ko'],
  が: ['ga'], ぎ: ['gi'], ぐ: ['gu'], げ: ['ge'], ご: ['go'],
  さ: ['sa'], し: ['shi', 'si'], す: ['su'], せ: ['se'], そ: ['so'],
  ざ: ['za'], じ: ['ji', 'zi'], ず: ['zu'], ぜ: ['ze'], ぞ: ['zo'],
  た: ['ta'], ち: ['chi', 'ti'], つ: ['tsu', 'tu'], て: ['te'], と: ['to'],
  だ: ['da'], ぢ: ['di'], づ: ['du'], で: ['de'], ど: ['do'],
  な: ['na'], に: ['ni'], ぬ: ['nu'], ね: ['ne'], の: ['no'],
  は: ['ha'], ひ: ['hi'], ふ: ['fu', 'hu'], へ: ['he'], ほ: ['ho'],
  ば: ['ba'], び: ['bi'], ぶ: ['bu'], べ: ['be'], ぼ: ['bo'],
  ぱ: ['pa'], ぴ: ['pi'], ぷ: ['pu'], ぺ: ['pe'], ぽ: ['po'],
  ま: ['ma'], み: ['mi'], む: ['mu'], め: ['me'], も: ['mo'],
  や: ['ya'], ゆ: ['yu'], よ: ['yo'], ら: ['ra'], り: ['ri'], る: ['ru'], れ: ['re'], ろ: ['ro'],
  わ: ['wa'], を: ['wo'], ん: ['nn', 'n'],
  ぁ: ['xa', 'la'], ぃ: ['xi', 'li'], ぅ: ['xu', 'lu'], ぇ: ['xe', 'le'], ぉ: ['xo', 'lo'],
  ゃ: ['xya', 'lya'], ゅ: ['xyu', 'lyu'], ょ: ['xyo', 'lyo'], っ: ['xtu', 'ltu'],
  '、': [','], '。': ['.'], '・': ['/'], 'ー': ['-'], ' ': [' '], '\n': ['Enter'],
}

export type RomanToken = { kana: string; options: string[] }

export function tokenizeReading(reading: string): RomanToken[] {
  const result: RomanToken[] = []
  for (let index = 0; index < reading.length; index += 1) {
    const pair = reading.slice(index, index + 2)
    if (digraphs[pair]) {
      result.push({ kana: pair, options: digraphs[pair] })
      index += 1
      continue
    }
    const kana = reading[index]
    if (kana === 'っ' && index + 1 < reading.length) {
      const nextPair = reading.slice(index + 1, index + 3)
      const nextOptions = digraphs[nextPair] ?? singles[reading[index + 1]]
      const consonants = nextOptions?.map((option) => option[0]).filter((value) => !'aiueon'.includes(value)) ?? []
      result.push({ kana, options: [...new Set([...consonants, 'xtu', 'ltu'])] })
      continue
    }
    result.push({ kana, options: singles[kana] ?? [kana] })
  }
  return result
}

export function evaluateRoman(input: string, reading: string): RomanEvaluation {
  const tokens = tokenizeReading(reading)
  const memo = new Map<string, { valid: boolean; complete: boolean; next: Set<string> }>()
  const walk = (tokenIndex: number, inputIndex: number): { valid: boolean; complete: boolean; next: Set<string> } => {
    const key = `${tokenIndex}:${inputIndex}`
    const cached = memo.get(key)
    if (cached) return cached
    if (tokenIndex === tokens.length) {
      const value = { valid: inputIndex === input.length, complete: inputIndex === input.length, next: new Set<string>() }
      memo.set(key, value)
      return value
    }
    const remaining = input.slice(inputIndex)
    let valid = false
    let complete = false
    const next = new Set<string>()
    for (const option of tokens[tokenIndex].options) {
      if (remaining.length < option.length && option.startsWith(remaining)) {
        valid = true
        next.add(option[remaining.length])
      } else if (remaining.startsWith(option)) {
        const child = walk(tokenIndex + 1, inputIndex + option.length)
        if (child.valid) {
          valid = true
          complete ||= child.complete
          child.next.forEach((character) => next.add(character))
        }
      }
    }
    const value = { valid, complete, next }
    memo.set(key, value)
    return value
  }
  const result = walk(0, 0)
  return {
    valid: result.valid,
    complete: result.complete,
    next: [...result.next],
    canonical: tokens.map((token) => token.options[0]).join(''),
  }
}

export function commonPrefixLength(left: string, right: string) {
  let index = 0
  while (index < left.length && index < right.length && left[index] === right[index]) index += 1
  return index
}

export function calculateAccuracy(targetLength: number, corrections: number, misses = 0) {
  if (targetLength + corrections + misses === 0) return 100
  return Math.round((targetLength / (targetLength + corrections + misses)) * 1000) / 10
}

export function calculateScore(characters: number, accuracy: number, seconds: number, combo: number) {
  const pace = characters / Math.max(seconds, 1)
  const accuracyFactor = Math.pow(accuracy / 100, 3)
  return Math.max(0, Math.round((characters * 10 + pace * 120 + combo * 2) * accuracyFactor))
}
