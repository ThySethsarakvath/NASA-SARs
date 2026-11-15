export const explorerUrl = '/?page=explore'
export const agricultureUrl = '/?page=agriculture'

export const photographs = [
  { id: 'wetlands', title: 'Tonlé Sap 01', author: 'LBM1948', src: '/images/tonle-sap-wetlands.jpg', location: 'Tonlé Sap wetlands, Siem Reap', date: '2014-12-11', source: 'https://commons.wikimedia.org/wiki/File:Tonl%C3%A9_Sap_01.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  { id: 'lake', title: 'Tonle Sap (9)', author: 'Krzysztof Golik', src: '/images/tonle-sap-lake.jpg', location: 'Tonlé Sap near Kampong Phlouk', date: '2015-11-11', source: 'https://commons.wikimedia.org/wiki/File:Tonle_Sap_(9).jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  { id: 'forest', title: 'Prey Lang Forest Aerial', author: 'Prey Lang Community Network', src: '/images/prey-lang-forest.jpg', location: 'Prey Lang Forest, Cambodia', date: '2008-07-24', source: 'https://commons.wikimedia.org/wiki/File:Prey_Lang_Forest_Aerial.jpg', license: 'CC BY 2.5', licenseUrl: 'https://creativecommons.org/licenses/by/2.5/' },
  { id: 'agriculture', title: "Cambodia’s rice fields", author: 'Dmitry A. Mottl', src: '/images/cambodia-rice-fields.jpg', location: 'Rice fields near Siem Reap, Cambodia', date: '2015-01-01', source: 'https://commons.wikimedia.org/wiki/File:Cambodia%27s_rice_fields.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  { id: 'atmosphere', title: 'Skyline of Phnom Penh', author: 'Mao Piseth', src: '/images/phnom-penh-skyline.jpg', location: 'Phnom Penh, Cambodia', date: '2022-10-02', source: 'https://commons.wikimedia.org/wiki/File:Skyline_of_Phnom_Penh.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
] as const

export interface TeamMember { id: string; name: string | null; role: string | null; photo: string | null; photoFocus?: [number, number]; photoScale?: number }
// Names, responsibilities and source portraits supplied by the team.
export const teamMembers: TeamMember[] = [
  { id: '01', name: 'Sethasarakvath Thy', role: 'Team Lead · Frontend & Systems Integration', photo: '/images/vath.jpg', photoFocus: [29, 48], photoScale: 2.6 },
  { id: '02', name: 'Sun Sovisal', role: 'Data Acquisition & Processing', photo: '/images/sal.jpg', photoFocus: [50, 38], photoScale: 2 },
  { id: '03', name: 'Sokha Ordom', role: 'Data Acquisition & Processing', photo: '/images/dom.jpg', photoFocus: [30, 45], photoScale: 3 },
  { id: '04', name: 'Chheng Rayuth', role: 'DevOps Engineer', photo: '/images/yut.jpg', photoFocus: [50, 45], photoScale: 2.3 },
  { id: '05', name: 'Tat Chansereyvong', role: 'Systems Integration Engineer', photo: '/images/vong.jpg', photoFocus: [52, 65], photoScale: 2.2 },
]
