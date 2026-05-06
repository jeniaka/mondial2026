// Comprehensive country → ISO 3166-1 alpha-2 (or sub-region) map.
// Covers all FIFA member nations + common name variants.
export const countryToCode: Record<string, string> = {
  // A
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "American Samoa": "AS",
  "Andorra": "AD", "Angola": "AO", "Anguilla": "AI", "Antigua and Barbuda": "AG",
  "Argentina": "AR", "Armenia": "AM", "Aruba": "AW", "Australia": "AU", "Austria": "AT",
  "Azerbaijan": "AZ",
  // B
  "Bahamas": "BS", "Bahrain": "BH", "Bangladesh": "BD", "Barbados": "BB",
  "Belarus": "BY", "Belgium": "BE", "Belize": "BZ", "Benin": "BJ", "Bermuda": "BM",
  "Bhutan": "BT", "Bolivia": "BO", "Bosnia and Herzegovina": "BA", "Botswana": "BW",
  "Brazil": "BR", "British Virgin Islands": "VG", "Brunei": "BN", "Bulgaria": "BG",
  "Burkina Faso": "BF", "Burundi": "BI",
  // C
  "Cambodia": "KH", "Cameroon": "CM", "Canada": "CA", "Cape Verde": "CV",
  "Cabo Verde": "CV", "Cayman Islands": "KY", "Central African Republic": "CF",
  "Chad": "TD", "Chile": "CL", "China": "CN", "China PR": "CN", "Chinese Taipei": "TW",
  "Colombia": "CO", "Comoros": "KM", "Congo": "CG", "Congo DR": "CD",
  "DR Congo": "CD", "Cook Islands": "CK", "Costa Rica": "CR", "Côte d'Ivoire": "CI",
  "Cote d'Ivoire": "CI", "Ivory Coast": "CI", "Croatia": "HR", "Cuba": "CU",
  "Curaçao": "CW", "Curacao": "CW", "Cyprus": "CY", "Czechia": "CZ",
  "Czech Republic": "CZ",
  // D
  "Denmark": "DK", "Djibouti": "DJ", "Dominica": "DM", "Dominican Republic": "DO",
  // E
  "East Timor": "TL", "Timor-Leste": "TL", "Ecuador": "EC", "Egypt": "EG",
  "El Salvador": "SV", "England": "GB-ENG", "Equatorial Guinea": "GQ",
  "Eritrea": "ER", "Estonia": "EE", "Eswatini": "SZ", "Swaziland": "SZ",
  "Ethiopia": "ET",
  // F
  "Faroe Islands": "FO", "Fiji": "FJ", "Finland": "FI", "France": "FR",
  // G
  "Gabon": "GA", "Gambia": "GM", "Georgia": "GE", "Germany": "DE", "Ghana": "GH",
  "Gibraltar": "GI", "Greece": "GR", "Grenada": "GD", "Guam": "GU", "Guatemala": "GT",
  "Guinea": "GN", "Guinea-Bissau": "GW", "Guyana": "GY",
  // H
  "Haiti": "HT", "Honduras": "HN", "Hong Kong": "HK", "Hungary": "HU",
  // I
  "Iceland": "IS", "India": "IN", "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ",
  "Republic of Ireland": "IE", "Ireland": "IE", "Israel": "IL", "Italy": "IT",
  // J
  "Jamaica": "JM", "Japan": "JP", "Jordan": "JO",
  // K
  "Kazakhstan": "KZ", "Kenya": "KE", "Kosovo": "XK", "Kuwait": "KW",
  "Kyrgyzstan": "KG",
  // L
  "Laos": "LA", "Latvia": "LV", "Lebanon": "LB", "Lesotho": "LS", "Liberia": "LR",
  "Libya": "LY", "Liechtenstein": "LI", "Lithuania": "LT", "Luxembourg": "LU",
  // M
  "Macau": "MO", "Madagascar": "MG", "Malawi": "MW", "Malaysia": "MY", "Maldives": "MV",
  "Mali": "ML", "Malta": "MT", "Mauritania": "MR", "Mauritius": "MU", "Mexico": "MX",
  "Moldova": "MD", "Monaco": "MC", "Mongolia": "MN", "Montenegro": "ME",
  "Montserrat": "MS", "Morocco": "MA", "Mozambique": "MZ", "Myanmar": "MM",
  // N
  "Namibia": "NA", "Nepal": "NP", "Netherlands": "NL", "New Caledonia": "NC",
  "New Zealand": "NZ", "Nicaragua": "NI", "Niger": "NE", "Nigeria": "NG",
  "North Korea": "KP", "Korea DPR": "KP", "North Macedonia": "MK", "Macedonia": "MK",
  "Northern Ireland": "GB-NIR", "Norway": "NO",
  // O
  "Oman": "OM",
  // P
  "Pakistan": "PK", "Palestine": "PS", "Panama": "PA", "Papua New Guinea": "PG",
  "Paraguay": "PY", "Peru": "PE", "Philippines": "PH", "Poland": "PL",
  "Portugal": "PT", "Puerto Rico": "PR",
  // Q
  "Qatar": "QA",
  // R
  "Romania": "RO", "Russia": "RU", "Rwanda": "RW",
  // S
  "Saint Kitts and Nevis": "KN", "Saint Lucia": "LC",
  "Saint Vincent and the Grenadines": "VC", "Samoa": "WS", "San Marino": "SM",
  "São Tomé and Príncipe": "ST", "Sao Tome and Principe": "ST", "Saudi Arabia": "SA",
  "Scotland": "GB-SCT", "Senegal": "SN", "Serbia": "RS", "Seychelles": "SC",
  "Sierra Leone": "SL", "Singapore": "SG", "Slovakia": "SK", "Slovenia": "SI",
  "Solomon Islands": "SB", "Somalia": "SO", "South Africa": "ZA", "South Korea": "KR",
  "Korea Republic": "KR", "Korea, Republic of": "KR", "South Sudan": "SS",
  "Spain": "ES", "Sri Lanka": "LK", "Sudan": "SD", "Suriname": "SR", "Sweden": "SE",
  "Switzerland": "CH", "Syria": "SY",
  // T
  "Tahiti": "PF", "Taiwan": "TW", "Tajikistan": "TJ", "Tanzania": "TZ",
  "Thailand": "TH", "Togo": "TG", "Tonga": "TO", "Trinidad and Tobago": "TT",
  "Tunisia": "TN", "Türkiye": "TR", "Turkiye": "TR", "Turkey": "TR",
  "Turkmenistan": "TM", "Turks and Caicos Islands": "TC",
  // U
  "Uganda": "UG", "Ukraine": "UA", "United Arab Emirates": "AE", "UAE": "AE",
  "United States": "US", "United States of America": "US", "USA": "US", "US": "US",
  "Uruguay": "UY", "US Virgin Islands": "VI", "Uzbekistan": "UZ",
  // V
  "Vanuatu": "VU", "Venezuela": "VE", "Vietnam": "VN",
  // W
  "Wales": "GB-WLS",
  // Y
  "Yemen": "YE",
  // Z
  "Zambia": "ZM", "Zimbabwe": "ZW",
};

const subregionFlags: Record<string, string> = {
  "GB-ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "GB-SCT": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "GB-WLS": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "GB-NIR": "🇬🇧",
};

export function flagEmoji(country: string): string | null {
  const code = countryToCode[country.trim()];
  if (!code) return null;
  if (code.startsWith("GB-")) return subregionFlags[code] ?? "🇬🇧";
  if (code === "XK") return null; // No standard emoji for Kosovo
  return code
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

// Initials fallback (max 3 letters)
export function countryInitials(country: string): string {
  const cleaned = country.trim();
  const code = countryToCode[cleaned];
  if (code && !code.startsWith("GB-")) return code;
  if (code === "GB-ENG") return "ENG";
  if (code === "GB-SCT") return "SCO";
  if (code === "GB-WLS") return "WAL";
  if (code === "GB-NIR") return "NIR";
  // Build from words
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0] + (words[2]?.[0] ?? "")).toUpperCase();
  return cleaned.slice(0, 3).toUpperCase();
}
