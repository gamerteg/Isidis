export type TarotCard = {
    id: number
    name: string
    image: string
    meaning: string
}

// Major Arcana (22 cards) for the daily draw
export const MAJOR_ARCANA: TarotCard[] = [
    { id: 0, name: 'O Louco', image: 'https://sacred-texts.com/tarot/pkt/img/ar00.jpg', meaning: 'Novos começos, aventura, inocência.' },
    { id: 1, name: 'O Mago', image: 'https://sacred-texts.com/tarot/pkt/img/ar01.jpg', meaning: 'Manifestação, poder, ação criativa.' },
    { id: 2, name: 'A Sacerdotisa', image: 'https://sacred-texts.com/tarot/pkt/img/ar02.jpg', meaning: 'Intuição, mistério, sabedoria interior.' },
    { id: 3, name: 'A Imperatriz', image: 'https://sacred-texts.com/tarot/pkt/img/ar03.jpg', meaning: 'Fertilidade, abundância, natureza.' },
    { id: 4, name: 'O Imperador', image: 'https://sacred-texts.com/tarot/pkt/img/ar04.jpg', meaning: 'Autoridade, estrutura, controle.' },
    { id: 5, name: 'O Hierofante', image: 'https://sacred-texts.com/tarot/pkt/img/ar05.jpg', meaning: 'Tradição, crenças, espiritualidade.' },
    { id: 6, name: 'Os Amantes', image: 'https://sacred-texts.com/tarot/pkt/img/ar06.jpg', meaning: 'Amor, harmonia, escolhas.' },
    { id: 7, name: 'A Carruagem', image: 'https://sacred-texts.com/tarot/pkt/img/ar07.jpg', meaning: 'Controle, força de vontade, vitória.' },
    { id: 8, name: 'A Força', image: 'https://sacred-texts.com/tarot/pkt/img/ar08.jpg', meaning: 'Coragem, compaixão, força interior.' },
    { id: 9, name: 'O Eremita', image: 'https://sacred-texts.com/tarot/pkt/img/ar09.jpg', meaning: 'Introspecção, solidão, guiança.' },
    { id: 10, name: 'A Roda da Fortuna', image: 'https://sacred-texts.com/tarot/pkt/img/ar10.jpg', meaning: 'Sorte, karma, ciclos da vida.' },
    { id: 11, name: 'A Justiça', image: 'https://sacred-texts.com/tarot/pkt/img/ar11.jpg', meaning: 'Justiça, verdade, lei.' },
    { id: 12, name: 'O Enforcado', image: 'https://sacred-texts.com/tarot/pkt/img/ar12.jpg', meaning: 'Sacrifício, deixar ir, novas perspectivas.' },
    { id: 13, name: 'A Morte', image: 'https://sacred-texts.com/tarot/pkt/img/ar13.jpg', meaning: 'Fim, transformação, transição.' },
    { id: 14, name: 'A Temperança', image: 'https://sacred-texts.com/tarot/pkt/img/ar14.jpg', meaning: 'Equilíbrio, moderação, paciência.' },
    { id: 15, name: 'O Diabo', image: 'https://sacred-texts.com/tarot/pkt/img/ar15.jpg', meaning: 'Sombra, apegos, sexualidade.' },
    { id: 16, name: 'A Torre', image: 'https://sacred-texts.com/tarot/pkt/img/ar16.jpg', meaning: 'Mudano repentina, caos, revelação.' },
    { id: 17, name: 'A Estrela', image: 'https://sacred-texts.com/tarot/pkt/img/ar17.jpg', meaning: 'Esperaça, fé, renovação.' },
    { id: 18, name: 'A Lua', image: 'https://sacred-texts.com/tarot/pkt/img/ar18.jpg', meaning: 'Ilusão, medo, subconsciente.' },
    { id: 19, name: 'O Sol', image: 'https://sacred-texts.com/tarot/pkt/img/ar19.jpg', meaning: 'Positividade, sucesso, vitalidade.' },
    { id: 20, name: 'O Julgamento', image: 'https://sacred-texts.com/tarot/pkt/img/ar20.jpg', meaning: 'Renascimento, chamado interior, absolvição.' },
    { id: 21, name: 'O Mundo', image: 'https://sacred-texts.com/tarot/pkt/img/ar21.jpg', meaning: 'Conclusão, realização, viagem.' }
]

export function getDailyCard(userId: string): TarotCard {
    // Simple deterministic algorithm based on date and userId
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const seedString = `${userId}-${today}`

    // Simple hash function
    let hash = 0
    for (let i = 0; i < seedString.length; i++) {
        const char = seedString.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
    }

    const index = Math.abs(hash) % MAJOR_ARCANA.length
    return MAJOR_ARCANA[index]
}
