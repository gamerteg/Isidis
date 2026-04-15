export interface Practitioner {
    id: string
    name: string
    title: string
    rating: number
    reviews: number
    price: number
    image: string
    tags: string[]
    bio?: string
    specialties?: string[]
}

export const practitioners: Practitioner[] = [
    {
        id: '1',
        name: 'Luna Silverweave',
        title: 'Mestra em Tarot & Astrologia',
        rating: 4.9,
        reviews: 1240,
        price: 89,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7hr6kfxF54goFGp2Vnq30WAT59q95Wk7ls0ny1Qvw0puhPkspR2gntFqhLpZFQt68oR1K6WjyIKrkstFcDpZYXdlIaxXOxRl1vSV5aSoKenfATmpfU7Uxc2lc52T3uB12Mu9blUYPI45Y_Ac23hmoEeWcfAaxsFLnbYqtLTxSvbRDizuZJGieGqBRjbgI2quq1vpjwoZez9vHsxcgIrLMNIm7G2UPEmkjPbQe1BJMYbApAI3DRgZLT1qIGzbXHEwWYnWtLVVF4-o6',
        tags: ['Amor', 'Vidas Passadas'],
        bio: 'Especialista em leituras profundas de alma e conexões de vidas passadas. Utilizo o Tarot de Thoth e Astrologia Kármica para revelar padrões ocultos.',
        specialties: ['Tarot de Thoth', 'Astrologia Kármica', 'Numerologia']
    },
    {
        id: '2',
        name: 'Caspian Thorne',
        title: 'Clarividente & Energia',
        rating: 5.0,
        reviews: 890,
        price: 125,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADrxSyGsBnC5Gdp5TQhP0-i8uEIMNalX1Ho1T1glYiDK3PluEs6xbyEsTsOjpTGIpmSviFcchexxcUvor3guFOzDXvVwVtrbTL_U-eGZHkY46GlsDj5x5fyVV1RWIBrH2Ds_fju3AkqBS2MCJZ1bqkeqh_8mdWhfA57vmLRGZbyaAQFfuQtoyjW4lx7BuVOa4JJH74fMaKm6vx34iIkXh4uYcsGVcrJVSqaOIa5_wU4iuqbe4fKVGNFpbfbSEWLlpswFpFpYVyj-rm',
        tags: ['Carreira', 'Aura'],
        bio: 'Clarividente natural com foco em desbloqueios energéticos e orientação de carreira. Minhas leituras são diretas e transformadoras.',
        specialties: ['Clarividência', 'Limpeza Energética', 'Orientação Vocacional']
    },
    {
        id: '3',
        name: 'Selene Night',
        title: 'Tarot Intuitivo & Empatia',
        rating: 4.8,
        reviews: 2100,
        price: 75,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3Cw2sQ2opMjaFhrkw4q-34-ObLGGberwBK3x38xf4X_kxhtkGqk75EwgSBeUlgTRmXrBPOp1AXKadR3XHuwWKYS4byGmwUg4VJ1LzjJk5mdjmBsVyMCv_j2Bz8xD3aeX9ysdSymZK8oSUnrDoZwNwfoTWsGDcISc_z8VN-9TjELyaSkL7OS4glIrREoi1lHJAY6bFu7QEaNCxsny0wLbzMot-QoNbOToMCqfRmmPl4QUVXC5NGtJni4Hw2s54htoE39bx3Euv21qZ',
        tags: ['Espiritual', 'Tarot'],
        bio: 'Cartomante intuitiva com abordagem terapêutica. Ajudando você a encontrar clareza emocional e paz interior através das cartas.',
        specialties: ['Tarot Rider-Waite', 'Aconselhamento Emocional', 'Meditação Guiada']
    },
    {
        id: '4',
        name: 'Dorian Vane',
        title: 'Mapas Natais & Runas',
        rating: 4.9,
        reviews: 560,
        price: 110,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8eiSG9sw-IERgDqgb6zqHe4CeORd6ACtRyHRVCb6vxEau6GNBzjho-MyUS-syuhgzCvcFAir1vqKyJqxcMwe_ehDRT8t9R_8xdwWkWN6w6RSGQdXGi2BEsHJLaVYsU5REU-hPrJvZ0nze8WFhEQ-QyjZYEKhlyeMHs-3k4hg8nbH8jBZ2d59A4sIQ6xVsu_ubtS8d8s6esLSHBFnNB8iFB7Gnax13t3I0VeMys5R7R_YF7DEd-p2nrTFtI82XeusCq-oU5x8yQTEu',
        tags: ['Planetas', 'Runas'],
        bio: 'Místico moderno combinando a sabedoria das Runas Nórdicas com a precisão da Astrologia Clássica. Desvende os mistérios do seu mapa.',
        specialties: ['Astrologia Clássica', 'Runas Nórdicas', 'Sinastria']
    }
]
