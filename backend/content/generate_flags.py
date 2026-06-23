"""Generate flags.json for the Flags pack.

Pipeline (Stages 1-3 of the content design):
  - Structured facts + kid-friendly prose: curated below (human-verify before shipping).
  - Flag images: downloaded from flagcdn.com (derived from public-domain national flags),
    base64-encoded into the JSON so the app needs no third-party calls at runtime.

Usage: cd backend && python content/generate_flags.py
Then load with: python load_content.py

Populations are rounded to kid-friendly approximations on purpose (evergreen, easy to read).
Verify facts before launch — this is an AI-drafted, human-verified draft.
"""
import base64
import json
import sys
import urllib.request
from pathlib import Path

OUT = Path(__file__).parent / "flags.json"
FLAG_URL = "https://flagcdn.com/w640/{code}.png"

PACK = {
    "name": "Flags", "icon": "🚩", "color": "#4C7DF0",
    "ageBand": "5-8", "isFree": False, "freeSampleCount": 10,
    "productId": "pack.flags", "order": 2,
}

# code, name, emoji, capital, population, continent, cool fact, short text, detail text
COUNTRIES = [
    ("br", "Brazil", "🇧🇷", "Brasília", "212 million", "South America",
     "Home to most of the Amazon rainforest 🌳",
     "Brazil is the biggest country in South America! It's famous for soccer, colorful carnivals, and the giant Amazon rainforest.",
     "Brazil is the largest country in South America and the fifth-largest in the whole world. About 212 million people live there, and its capital city is Brasília. Brazil has most of the Amazon rainforest, home to millions of animals and plants you won't find anywhere else!"),
    ("jp", "Japan", "🇯🇵", "Tokyo", "125 million", "Asia",
     "Made of almost 7,000 islands! 🏝️",
     "Japan is a country made of thousands of islands in Asia. It's famous for cherry blossoms, fast trains, and yummy sushi!",
     "Japan is an island country in Asia made of almost 7,000 islands. Its capital is Tokyo, one of the biggest cities in the world. Japan is known for beautiful pink cherry blossom trees, super-fast bullet trains, and inventing lots of video games!"),
    ("us", "United States", "🇺🇸", "Washington, D.C.", "330 million", "North America",
     "Has 50 stars, one for each state ⭐",
     "The United States is a big country in North America with 50 states. Its flag has 50 stars and 13 stripes!",
     "The United States is the third-largest country in the world. It has 50 states, and the flag has one star for each state plus 13 stripes for the first 13 colonies. Its capital is Washington, D.C., and it's home to deserts, mountains, and giant cities."),
    ("in", "India", "🇮🇳", "New Delhi", "1.4 billion", "Asia",
     "One of the most people of any country! 🐘",
     "India is a colorful country in Asia with more than a billion people. It's famous for tigers, elephants, and tasty spicy food!",
     "India is home to about 1.4 billion people — almost one out of every six people on Earth! Its capital is New Delhi. India has wild tigers and elephants, the snowy Himalaya mountains, and the beautiful Taj Mahal."),
    ("fr", "France", "🇫🇷", "Paris", "67 million", "Europe",
     "Home of the Eiffel Tower 🗼",
     "France is a country in Europe famous for the Eiffel Tower, yummy bread, and tasty cheese!",
     "France is in Europe and its capital is Paris, where you'll find the famous Eiffel Tower. France is known for delicious bread, hundreds of kinds of cheese, and beautiful castles called châteaux."),
    ("de", "Germany", "🇩🇪", "Berlin", "83 million", "Europe",
     "Famous for fairy-tale castles 🏰",
     "Germany is a country in Europe with fairy-tale castles, forests, and fast cars!",
     "Germany is in the middle of Europe and its capital is Berlin. It's famous for fairy-tale castles, big dark forests, tasty pretzels, and building some of the world's fastest cars."),
    ("it", "Italy", "🇮🇹", "Rome", "59 million", "Europe",
     "Shaped like a boot! 👢",
     "Italy is a country in Europe shaped like a boot. It's the home of pizza and pasta!",
     "Italy is in Europe and is shaped like a tall boot. Its capital is Rome, where you can see the ancient Colosseum. Italy gave the world pizza, pasta, and gelato ice cream!"),
    ("ca", "Canada", "🇨🇦", "Ottawa", "38 million", "North America",
     "Has a red maple leaf on its flag 🍁",
     "Canada is a huge country in North America with a red maple leaf on its flag. It gets lots of snow!",
     "Canada is the second-largest country in the world, but not many people live there. Its capital is Ottawa. Canada has snowy winters, moose and bears, and a famous red maple leaf right in the middle of its flag."),
    ("au", "Australia", "🇦🇺", "Canberra", "26 million", "Oceania",
     "Home to kangaroos and koalas 🦘",
     "Australia is a country and a continent! It's home to bouncy kangaroos and cuddly koalas.",
     "Australia is the only country that is also a whole continent. Its capital is Canberra. It's famous for animals you won't see anywhere else, like kangaroos, koalas, and wombats, plus the giant Great Barrier Reef."),
    ("cn", "China", "🇨🇳", "Beijing", "1.4 billion", "Asia",
     "Built the Great Wall, super long! 🧱",
     "China is a giant country in Asia with more than a billion people. It built the famous Great Wall!",
     "China has about 1.4 billion people, more than almost any country. Its capital is Beijing. China built the Great Wall, which is so long it would take months to walk, and it's the home of cute giant pandas."),
    ("gb", "United Kingdom", "🇬🇧", "London", "67 million", "Europe",
     "Where you'll find Big Ben 🕰️",
     "The United Kingdom is in Europe and includes England, Scotland, Wales, and Northern Ireland. It has a king!",
     "The United Kingdom is made of four parts: England, Scotland, Wales, and Northern Ireland. Its capital is London, home to Big Ben and Buckingham Palace. It has a royal family with a king or queen."),
    ("es", "Spain", "🇪🇸", "Madrid", "47 million", "Europe",
     "Famous for flamenco dancing 💃",
     "Spain is a sunny country in Europe famous for flamenco dancing, beaches, and yummy food!",
     "Spain is in Europe and its capital is Madrid. It's a warm, sunny country known for flamenco dancing, fun festivals, sandy beaches, and a tasty rice dish called paella."),
    ("mx", "Mexico", "🇲🇽", "Mexico City", "128 million", "North America",
     "Has an eagle and a snake on its flag 🦅",
     "Mexico is a country in North America with colorful festivals, tacos, and ancient pyramids!",
     "Mexico is in North America and its capital is Mexico City. Its flag shows an eagle eating a snake on a cactus! Mexico has tasty tacos, bright festivals, and giant pyramids built long ago by the Aztecs and Maya."),
    ("eg", "Egypt", "🇪🇬", "Cairo", "104 million", "Africa",
     "Home of the giant pyramids 🐫",
     "Egypt is a country in Africa famous for giant pyramids, pharaohs, and the long Nile River!",
     "Egypt is in Africa and its capital is Cairo. Thousands of years ago, Egyptians built the enormous pyramids and the Sphinx. The river Nile, the longest river in the world, flows right through it."),
    ("za", "South Africa", "🇿🇦", "Pretoria", "60 million", "Africa",
     "Its flag has six colors! 🌈",
     "South Africa is at the bottom of Africa and has a flag with six bright colors. It's home to lions and elephants!",
     "South Africa is at the very bottom of Africa. It has three capital cities, and the main one is Pretoria. Its colorful flag has six colors. On safari there you can spot lions, elephants, rhinos, leopards, and buffalo."),
    ("ke", "Kenya", "🇰🇪", "Nairobi", "54 million", "Africa",
     "Famous for safari animals 🦁",
     "Kenya is a country in Africa where you can go on safari and see lions, zebras, and giraffes!",
     "Kenya is in eastern Africa and its capital is Nairobi. It's one of the best places in the world to go on safari and see lions, elephants, zebras, and tall giraffes roaming the grassy savanna."),
    ("ar", "Argentina", "🇦🇷", "Buenos Aires", "46 million", "South America",
     "Has a smiling sun on its flag ☀️",
     "Argentina is a country in South America with a smiling sun on its flag. It's famous for soccer and tango dancing!",
     "Argentina is a long country in South America and its capital is Buenos Aires. Its flag has a friendly golden sun called the Sun of May. Argentina loves soccer, tango dancing, and has cowboys called gauchos."),
    ("ru", "Russia", "🇷🇺", "Moscow", "144 million", "Europe & Asia",
     "The biggest country in the world! 🗺️",
     "Russia is the biggest country in the whole world! It's so wide it's in both Europe and Asia.",
     "Russia is the largest country on Earth, so big it stretches across two continents — Europe and Asia. Its capital is Moscow, home to the colorful onion-domed St. Basil's Cathedral. Winters there can be very, very cold and snowy."),
    ("kr", "South Korea", "🇰🇷", "Seoul", "52 million", "Asia",
     "Has a yin-yang circle on its flag ☯️",
     "South Korea is a country in Asia famous for K-pop music, video games, and tasty food!",
     "South Korea is in Asia and its capital is Seoul. Its flag has a red-and-blue circle in the middle. South Korea is known for catchy K-pop music, exciting video games, and a spicy dish called kimchi."),
    ("gr", "Greece", "🇬🇷", "Athens", "10 million", "Europe",
     "Where the Olympic Games began 🏛️",
     "Greece is a sunny country in Europe with ancient temples and blue seas. The Olympics started here!",
     "Greece is in Europe and its capital is Athens. Long ago the ancient Greeks started the Olympic Games and told amazing myths about gods and heroes. Today people love its white-and-blue islands and sparkling seas."),
    ("se", "Sweden", "🇸🇪", "Stockholm", "10 million", "Europe",
     "You can see the Northern Lights here 🌌",
     "Sweden is a country in northern Europe with forests, lakes, and snowy winters. The Northern Lights glow here!",
     "Sweden is in northern Europe and its capital is Stockholm. It has thousands of lakes and big forests. In the far north you can sometimes see the Northern Lights — glowing colors dancing in the night sky."),
    ("ch", "Switzerland", "🇨🇭", "Bern", "9 million", "Europe",
     "Famous for chocolate and tall mountains 🏔️",
     "Switzerland is a country in Europe with tall snowy mountains called the Alps. It's famous for yummy chocolate!",
     "Switzerland is in Europe and its capital is Bern. It's covered in tall, snowy mountains called the Alps, perfect for skiing. Switzerland is famous around the world for delicious chocolate and tasty cheese."),
    ("nl", "Netherlands", "🇳🇱", "Amsterdam", "17 million", "Europe",
     "Famous for windmills and tulips 🌷",
     "The Netherlands is a flat country in Europe full of windmills, tulips, and bicycles!",
     "The Netherlands is in Europe and its capital is Amsterdam. Much of it is very flat and even below sea level! It's famous for spinning windmills, colorful tulip flowers, and people who ride bicycles everywhere."),
    ("no", "Norway", "🇳🇴", "Oslo", "5 million", "Europe",
     "Land of fjords and Vikings ⛵",
     "Norway is a country in northern Europe with deep blue fjords and tall mountains. Vikings came from here!",
     "Norway is in northern Europe and its capital is Oslo. It has beautiful fjords — deep sea inlets surrounded by steep cliffs. Long ago, brave Viking sailors set off from Norway to explore faraway lands."),
    ("ie", "Ireland", "🇮🇪", "Dublin", "5 million", "Europe",
     "Known as the Emerald Isle 🍀",
     "Ireland is a green island in Europe famous for rolling hills, rainbows, and stories about leprechauns!",
     "Ireland is a green island in Europe and its capital is Dublin. It's so green it's nicknamed the Emerald Isle. People tell fun stories about tiny leprechauns who hide pots of gold at the end of rainbows."),
    ("pt", "Portugal", "🇵🇹", "Lisbon", "10 million", "Europe",
     "Famous explorers sailed from here ⛵",
     "Portugal is a country in Europe by the ocean. Long ago, brave explorers sailed from here across the seas!",
     "Portugal is in Europe, right beside the Atlantic Ocean, and its capital is Lisbon. Hundreds of years ago, Portuguese explorers sailed in wooden ships to discover new sea routes around the world."),
    ("tr", "Turkey", "🇹🇷", "Ankara", "85 million", "Europe & Asia",
     "Sits in both Europe and Asia 🌉",
     "Turkey is a country that sits in both Europe and Asia! It has a star and moon on its flag.",
     "Turkey is special because it sits in two continents at once — Europe and Asia. Its capital is Ankara. Its red flag has a white crescent moon and star. Turkey is full of ancient cities and tasty treats."),
    ("th", "Thailand", "🇹🇭", "Bangkok", "70 million", "Asia",
     "Known as the Land of Smiles 🐘",
     "Thailand is a sunny country in Asia famous for golden temples, elephants, and yummy noodles!",
     "Thailand is in Asia and its capital is Bangkok. It's nicknamed the Land of Smiles because the people are so friendly. Thailand has sparkling golden temples, gentle elephants, and delicious spicy noodle dishes."),
    ("id", "Indonesia", "🇮🇩", "Jakarta", "274 million", "Asia",
     "Made of more than 17,000 islands! 🌋",
     "Indonesia is a country in Asia made of thousands of islands, with volcanoes and rainforests!",
     "Indonesia is in Asia and its capital is Jakarta. It's made of more than 17,000 islands! It has steamy rainforests, smoking volcanoes, and special animals like orangutans and the giant Komodo dragon."),
    ("nz", "New Zealand", "🇳🇿", "Wellington", "5 million", "Oceania",
     "Home of the kiwi bird 🥝",
     "New Zealand is a country of two islands near Australia. It's home to the fluffy kiwi bird!",
     "New Zealand is made of two main islands near Australia, and its capital is Wellington. It has green hills, tall mountains, and the kiwi — a small fluffy bird that can't fly and comes out at night."),
    ("sa", "Saudi Arabia", "🇸🇦", "Riyadh", "35 million", "Asia",
     "Has Arabic writing and a sword on its flag ⚔️",
     "Saudi Arabia is a desert country in Asia. Its green flag has Arabic writing and a sword!",
     "Saudi Arabia is in Asia and its capital is Riyadh. Much of it is sandy desert that gets very hot. Its green flag has special Arabic words and a sword. Camels have traveled across its deserts for thousands of years."),
    ("ng", "Nigeria", "🇳🇬", "Abuja", "218 million", "Africa",
     "The most people of any African country 🥁",
     "Nigeria is a country in Africa with more people than any other in Africa. It loves music and drumming!",
     "Nigeria is in Africa and its capital is Abuja. More people live there than in any other African country. Nigeria is famous for lively music, colorful clothes, joyful drumming, and tasty jollof rice."),
]


def fetch_flag_b64(code: str) -> str:
    url = FLAG_URL.format(code=code)
    with urllib.request.urlopen(url, timeout=30) as resp:
        data = resp.read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{code}: not a valid PNG")
    return "data:image/png;base64," + base64.b64encode(data).decode()


def main():
    items = []
    for code, name, emoji, capital, pop, continent, cool, short, detail in COUNTRIES:
        print(f"  {emoji} {name} ({code})...", end=" ", flush=True)
        img = fetch_flag_b64(code)
        items.append({
            "name": name,
            "image_base64": img,
            "learn": {
                "structured": [
                    {"label": "Capital", "value": capital},
                    {"label": "Population", "value": pop},
                    {"label": "Continent", "value": continent},
                    {"label": "Cool fact", "value": cool},
                ],
                "shortText": short,
                "detailText": detail,
                "emoji": emoji,
            },
        })
        print("ok")
    OUT.write_text(json.dumps({"pack": PACK, "items": items}, ensure_ascii=False, indent=2))
    print(f"\nWrote {len(items)} flags to {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nFAILED: {e}", file=sys.stderr)
        sys.exit(1)
