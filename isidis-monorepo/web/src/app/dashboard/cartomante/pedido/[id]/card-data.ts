export interface TarotCard {
    id: number
    name: string
    numeral: string
    keywords: string
    image: string
}

export const MAJOR_ARCANA: TarotCard[] = [
    { id: 0, numeral: '0', name: 'The Fool', keywords: 'Novos começos, inocência, aventura', image: 'https://sacred-texts.com/tarot/pkt/img/ar00.jpg' },
    { id: 1, numeral: 'I', name: 'The Magician', keywords: 'Potencial, ação, manifestação', image: 'https://sacred-texts.com/tarot/pkt/img/ar01.jpg' },
    { id: 2, numeral: 'II', name: 'The High Priestess', keywords: 'Intuição, mistério, sabedoria interior', image: 'https://sacred-texts.com/tarot/pkt/img/ar02.jpg' },
    { id: 3, numeral: 'III', name: 'The Empress', keywords: 'Abundância, feminino, natureza', image: 'https://sacred-texts.com/tarot/pkt/img/ar03.jpg' },
    { id: 4, numeral: 'IV', name: 'The Emperor', keywords: 'Autoridade, estrutura, controle', image: 'https://sacred-texts.com/tarot/pkt/img/ar04.jpg' },
    { id: 5, numeral: 'V', name: 'The Hierophant', keywords: 'Tradição, espiritualidade, orientação', image: 'https://sacred-texts.com/tarot/pkt/img/ar05.jpg' },
    { id: 6, numeral: 'VI', name: 'The Lovers', keywords: 'Amor, escolhas, harmonia', image: 'https://sacred-texts.com/tarot/pkt/img/ar06.jpg' },
    { id: 7, numeral: 'VII', name: 'The Chariot', keywords: 'Determinação, vitória, autocontrole', image: 'https://sacred-texts.com/tarot/pkt/img/ar07.jpg' },
    { id: 8, numeral: 'VIII', name: 'Strength', keywords: 'Coragem, paciência, compaixão', image: 'https://sacred-texts.com/tarot/pkt/img/ar08.jpg' },
    { id: 9, numeral: 'IX', name: 'The Hermit', keywords: 'Introspecção, solidão, busca interior', image: 'https://sacred-texts.com/tarot/pkt/img/ar09.jpg' },
    { id: 10, numeral: 'X', name: 'Wheel of Fortune', keywords: 'Ciclos, destino, mudança', image: 'https://sacred-texts.com/tarot/pkt/img/ar10.jpg' },
    { id: 11, numeral: 'XI', name: 'Justice', keywords: 'Equilíbrio, verdade, consequências', image: 'https://sacred-texts.com/tarot/pkt/img/ar11.jpg' },
    { id: 12, numeral: 'XII', name: 'The Hanged Man', keywords: 'Pausa, sacrifício, nova perspectiva', image: 'https://sacred-texts.com/tarot/pkt/img/ar12.jpg' },
    { id: 13, numeral: 'XIII', name: 'Death', keywords: 'Transformação, fim, renascimento', image: 'https://sacred-texts.com/tarot/pkt/img/ar13.jpg' },
    { id: 14, numeral: 'XIV', name: 'Temperance', keywords: 'Equilíbrio, moderação, paciência', image: 'https://sacred-texts.com/tarot/pkt/img/ar14.jpg' },
    { id: 15, numeral: 'XV', name: 'The Devil', keywords: 'Tentação, apego, sombra', image: 'https://sacred-texts.com/tarot/pkt/img/ar15.jpg' },
    { id: 16, numeral: 'XVI', name: 'The Tower', keywords: 'Ruptura, revelação, libertação', image: 'https://sacred-texts.com/tarot/pkt/img/ar16.jpg' },
    { id: 17, numeral: 'XVII', name: 'The Star', keywords: 'Esperança, inspiração, renovação', image: 'https://sacred-texts.com/tarot/pkt/img/ar17.jpg' },
    { id: 18, numeral: 'XVIII', name: 'The Moon', keywords: 'Ilusão, medo, subconsciente', image: 'https://sacred-texts.com/tarot/pkt/img/ar18.jpg' },
    { id: 19, numeral: 'XIX', name: 'The Sun', keywords: 'Alegria, sucesso, vitalidade', image: 'https://sacred-texts.com/tarot/pkt/img/ar19.jpg' },
    { id: 20, numeral: 'XX', name: 'Judgement', keywords: 'Renascimento, absolvição, despertar', image: 'https://sacred-texts.com/tarot/pkt/img/ar20.jpg' },
    { id: 21, numeral: 'XXI', name: 'The World', keywords: 'Completude, realização, integração', image: 'https://sacred-texts.com/tarot/pkt/img/ar21.jpg' },
]

export const SPREAD_POSITIONS = [
    'O Momento Presente',
    'Desafio',
    'Passado Recente',
    'Futuro Próximo',
    'Meta / Aspiração',
    'Fundação / Subconsciente',
    'Conselho',
    'Influências Externas',
    'Esperanças e Medos',
    'Resultado Final',
]
