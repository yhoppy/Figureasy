import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy, User, Users, ArrowLeftRight, Plus, Minus, Check, Search, X,
  ChevronRight, Sparkles, LogOut, BookOpen, Star, AlertCircle, Trash2, Settings, Eye, EyeOff
} from 'lucide-react';
import {
  supabase,
  signUpWithUsername, signInWithUsername, signOut,
  getSession, onAuthChange, ensureMemberRow,
  loadMembers, loadAllCollections, upsertSticker,
  subscribeToChanges, deleteMember,
} from './supabase.js';

// ============================================================
// OFFICIAL 2026 PANINI FIFA WORLD CUP STICKER DATA
// 980 stickers: 9 intro + 11 FIFA Museum + 48 teams × 20
// Each team: slot 1 = Team Logo (FOIL), slot 13 = Team Photo,
//   all others are players. Codes match Panini's official album.
// ============================================================

const INTRO = [
  { code: '00',   name: 'Panini Logo',                         foil: true },
  { code: 'FWC1', name: 'Official Emblem',                     foil: true },
  { code: 'FWC2', name: 'Official Emblem',                     foil: true },
  { code: 'FWC3', name: 'Official Mascots',                    foil: true },
  { code: 'FWC4', name: 'Official Slogan',                     foil: true },
  { code: 'FWC5', name: 'Official Ball',                       foil: true },
  { code: 'FWC6', name: 'Canada — Host Countries & Cities',    foil: true },
  { code: 'FWC7', name: 'Mexico — Host Countries & Cities',    foil: true },
  { code: 'FWC8', name: 'USA — Host Countries & Cities',       foil: true },
];

const MUSEUM = [
  { code: 'FWC9',  name: 'Italy 1934',         foil: true },
  { code: 'FWC10', name: 'Uruguay 1950',       foil: true },
  { code: 'FWC11', name: 'West Germany 1954',  foil: true },
  { code: 'FWC12', name: 'Brazil 1962',        foil: true },
  { code: 'FWC13', name: 'West Germany 1974',  foil: true },
  { code: 'FWC14', name: 'Argentina 1986',     foil: true },
  { code: 'FWC15', name: 'Brazil 1994',        foil: true },
  { code: 'FWC16', name: 'Brazil 2002',        foil: true },
  { code: 'FWC17', name: 'Italy 2006',         foil: true },
  { code: 'FWC18', name: 'Germany 2014',       foil: true },
  { code: 'FWC19', name: 'Argentina 2022',     foil: true },
];

const TEAMS = [
  { name: 'Algeria', code: 'ALG', flag: '🇩🇿', slots: [
    'Team Logo','Alexis Guendouz','Ramy Bensebaini','Youcef Atal','Rayan Aït-Nouri',
    'Mohamed Amine Tougai','Aïssa Mandi','Ismael Bennacer','Houssem Aouar','Hicham Boudaoui',
    'Ramiz Zerrouki','Nabil Bentaleb','Team Photo','Farés Chaibi','Riyad Mahrez',
    'Saïd Benrahma','Anis Hadj Moussa','Amine Gouiri','Baghdad Bounedjah','Mohamed Amoura'] },
  { name: 'Argentina', code: 'ARG', flag: '🇦🇷', slots: [
    'Team Logo','Emiliano Martinez','Nahuel Molina','Cristian Romero','Nicolas Otamendi',
    'Nicolas Tagliafico','Leonardo Balerdi','Enzo Fernandez','Alexis Mac Allister','Rodrigo De Paul',
    'Exequiel Palacios','Leandro Paredes','Team Photo','Nico Paz','Franco Mastantuono',
    'Nico Gonzalez','Lionel Messi','Lautaro Martinez','Julian Alvarez','Giuliano Simeone'] },
  { name: 'Australia', code: 'AUS', flag: '🇦🇺', slots: [
    'Team Logo','Mathew Ryan','Joe Gauci','Harry Souttar','Alessandro Circati',
    'Jordan Bos','Aziz Behich','Cameron Burgess','Lewis Miller','Milos Degenek',
    'Jackson Irvine','Riley McGree','Team Photo',"Aiden O'Neill",'Connor Metcalfe',
    'Patrick Yazbek','Craig Goodwin','Kusini Vengi','Nestory Irankunda','Mohamed Touré'] },
  { name: 'Austria', code: 'AUT', flag: '🇦🇹', slots: [
    'Team Logo','Alexander Schlager','Patrick Pentz','David Alaba','Kevin Danso',
    'Philipp Lienhart','Stefan Posch','Phillipp Mwene','Alexander Prass','Xaver Schlager',
    'Marcel Sabitzer','Konrad Laimer','Team Photo','Florian Grillitsch','Nicolas Seiwald',
    'Romano Schmid','Patrick Wimmer','Christoph Baumgartner','Michael Gregoritsch','Marko Arnautović'] },
  { name: 'Belgium', code: 'BEL', flag: '🇧🇪', slots: [
    'Team Logo','Thibaut Courtois','Arthur Theate','Timothy Castagne','Zeno Debast',
    'Brandon Mechele','Maxim De Cuyper','Thomas Meunier','Youri Tielemans','Amadou Onana',
    'Nicolas Raskin','Alexis Saelemaekers','Team Photo','Hans Vanaken','Kevin De Bruyne',
    'Jérémy Doku','Charles De Ketelaere','Leandro Trossard','Loïs Openda','Romelu Lukaku'] },
  { name: 'Bosnia and Herzegovina', code: 'BIH', flag: '🇧🇦', slots: [
    'Team Logo','Nikola Vasilj','Amer Dedic','Sead Kolasinac','Tarik Muharemovic',
    'Nihad Mujakic','Nikola Katic','Amir Hadziahmetovic','Benjamin Tahirovic','Armin Gigovic',
    'Ivan Sunjic','Ivan Basic','Team Photo','Dzenis Burnic','Esmir Bajraktarevic',
    'Amar Memic','Ermedin Demirovic','Edin Dzeko','Samed Bazdar','Haris Tabakovic'] },
  { name: 'Brazil', code: 'BRA', flag: '🇧🇷', slots: [
    'Team Logo','Alisson','Bento','Marquinhos','Éder Militão',
    'Gabriel Magalhães','Danilo','Wesley','Lucas Paquetá','Casemiro',
    'Bruno Guimarães','Luiz Henrique','Team Photo','Vinicius Júnior','Rodrygo',
    'João Pedro','Matheus Cunha','Gabriel Martinelli','Raphinha','Estêvão'] },
  { name: 'Canada', code: 'CAN', flag: '🇨🇦', slots: [
    'Team Logo','Dayne St. Clair','Alphonso Davies','Alistair Johnston','Samuel Adekugbe',
    'Richie Laryea','Derek Cornelius','Moïse Bombito','Kamal Miller','Stephen Eustáquio',
    'Ismaël Koné','Jonathan Osorio','Team Photo','Jacob Shaffelburg','Mathieu Choinière',
    'Niko Sigur','Tajon Buchanan','Liam Millar','Cyle Larin','Jonathan David'] },
  { name: 'Cape Verde', code: 'CPV', flag: '🇨🇻', slots: [
    'Team Logo','Vozinha','Logan Costa','Pico','Diney',
    'Steven Moreira','Wagner Pina','João Paulo','Yannick Semedo','Kevin Pina',
    'Patrick Andrade','Jamiro Monteiro','Team Photo','Deroy Duarte','Garry Rodrigues',
    'Jovane Cabral','Ryan Mendes','Dailon Livramento','Willy Semedo','Bebé'] },
  { name: 'Colombia', code: 'COL', flag: '🇨🇴', slots: [
    'Team Logo','Camilo Vargas','David Ospina','Dávinson Sánchez','Yerry Mina',
    'Daniel Muñoz','Johan Mojica','Jhon Lucumí','Santiago Arias','Jefferson Lerma',
    'Kevin Castaño','Richard Ríos','Team Photo','James Rodríguez','Juan Fernando Quintero',
    'Jorge Carrascal','Jhon Arias','Jhon Córdoba','Luis Suárez','Luis Díaz'] },
  { name: 'Congo DR', code: 'COD', flag: '🇨🇩', slots: [
    'Team Logo','Lionel Mpasi','Aaron Wan-Bissaka','Axel Tuanzebe','Arthur Masuaku',
    'Chancel Mbemba','Joris Kayembe','Charles Pickel',"Ngal'ayel Mukau",'Edo Kayembe',
    'Samuel Moutoussamy','Noah Sadiki','Team Photo','Théo Bongonda','Meschack Elia',
    'Yoane Wissa','Brian Cipenga','Fiston Mayele','Cédric Bakambu','Nathanaël Mbuku'] },
  { name: 'Croatia', code: 'CRO', flag: '🇭🇷', slots: [
    'Team Logo','Dominik Livaković','Duje Ćaleta-Car','Joško Gvardiol','Josip Stanišić',
    'Luka Vušković','Josip Šutalo','Kristijan Jakić','Luka Modrić','Mateo Kovačić',
    'Martin Baturina','Lovro Majer','Team Photo','Mario Pašalić','Petar Sučić',
    'Ivan Perišić','Marco Pašalić','Ante Budimir','Andrej Kramarić','Franjo Ivanović'] },
  { name: 'Curaçao', code: 'CUW', flag: '🇨🇼', slots: [
    'Team Logo','Eloy Room','Armando Obispo','Sherel Floranus','Jurien Gaari',
    'Joshua Brenet','Roshon van Eijma','Shurandy Sambo','Livano Comenencia','Godfried Roemeratoe',
    'Juninho Bacuna','Leandro Bacuna','Team Photo','Tahith Chong','Kenji Gorré',
    'Jearl Margaritha','Jürgen Locadia','Jeremy Antonisse','Gervane Kastaneer','Sontje Hansen'] },
  { name: 'Czechia', code: 'CZE', flag: '🇨🇿', slots: [
    'Team Logo','Matěj Kovář','Jindřich Staněk','Ladislav Krejčí','Vladimír Coufal',
    'Jaroslav Zelený','Tomáš Holeš','David Zima','Michal Sadílek','Lukáš Provod',
    'Lukáš Červ','Tomáš Souček','Team Photo','Pavel Šulc','Matěj Vydra',
    'Vasil Kušej','Tomáš Chorý','Václav Černý','Adam Hložek','Patrik Schick'] },
  { name: 'Ecuador', code: 'ECU', flag: '🇪🇨', slots: [
    'Team Logo','Hernán Galíndez','Gonzalo Valle','Piero Hincapié','Pervis Estupiñán',
    'Willian Pacho','Ángelo Preciado','Joel Ordóñez','Moisés Caicedo','Alan Franco',
    'Kendry Páez','Pedro Vite','Team Photo','John Yeboah','Leonardo Campana',
    'Gonzalo Plata','Nilson Angulo','Alan Minda','Kevin Rodríguez','Enner Valencia'] },
  { name: 'Egypt', code: 'EGY', flag: '🇪🇬', slots: [
    'Team Logo','Mohamed El Shenawy','Mohamed Hany','Mohamed Hamdy','Yasser Ibrahim',
    'Khaled Sobhi','Ramy Rabia','Hossam Abdelmaguid','Ahmed Fatouh','Marwan Attia',
    'Zizo','Hamdy Fathy','Team Photo','Mohamed Lasheen','Emam Ashour',
    'Osama Faisal','Mohamed Salah','Mostafa Mohamed','Trezeguet','Omar Marmoush'] },
  { name: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', slots: [
    'Team Logo','Jordan Pickford','John Stones','Marc Guéhi','Ezri Konsa',
    'Trent Alexander-Arnold','Reece James','Dan Burn','Jordan Henderson','Declan Rice',
    'Jude Bellingham','Cole Palmer','Team Photo','Morgan Rogers','Anthony Gordon',
    'Phil Foden','Bukayo Saka','Harry Kane','Marcus Rashford','Ollie Watkins'] },
  { name: 'France', code: 'FRA', flag: '🇫🇷', slots: [
    'Team Logo','Mike Maignan','Theo Hernandez','William Saliba','Jules Koundé',
    'Ibrahima Konaté','Dayot Upamecano','Lucas Digne','Aurélien Tchouaméni','Eduardo Camavinga',
    'Manu Koné','Adrien Rabiot','Team Photo','Michael Olise','Ousmane Dembélé',
    'Bradley Barcola','Désiré Doué','Kingsley Coman','Hugo Ekitiké','Kylian Mbappé'] },
  { name: 'Germany', code: 'GER', flag: '🇩🇪', slots: [
    'Team Logo','Marc-André ter Stegen','Jonathan Tah','David Raum','Nico Schlotterbeck',
    'Antonio Rüdiger','Waldemar Anton','Ridle Baku','Maximilian Mittelstädt','Joshua Kimmich',
    'Florian Wirtz','Felix Nmecha','Team Photo','Leon Goretzka','Jamal Musiala',
    'Serge Gnabry','Kai Havertz','Leroy Sané','Karim Adeyemi','Nick Woltemade'] },
  { name: 'Ghana', code: 'GHA', flag: '🇬🇭', slots: [
    'Team Logo','Lawrence Ati-Zigi','Tariq Lamptey','Mohammed Salisu','Alidu Seidu',
    'Alexander Djiku','Gideon Mensah','Caleb Yirenkyi','Abdul Issahaku Fatawu','Thomas Partey',
    'Salis Abdul Samed','Kamaldeen Sulemana','Team Photo','Mohammed Kudus','Iñaki Williams',
    'Jordan Ayew','André Ayew','Joseph Paintsil','Osman Bukari','Antoine Semenyo'] },
  { name: 'Haiti', code: 'HAI', flag: '🇭🇹', slots: [
    'Team Logo','Johny Placide','Carlens Arcus','Martin Experience','Jean-Kévin Duverne',
    'Ricardo Adé','Duke Lacroix','Garven Metusala','Hannes Delcroix','Leverton Pierre',
    'Danley Jean Jacques','Jean-Ricner Bellegarde','Team Photo','Christopher Attys','Derrick Etienne Jr.',
    'Josué Casimir','Ruben Providence','Duckens Nazon','Louicius Deedson','Frantzdy Pierrot'] },
  { name: 'Iran', code: 'IRN', flag: '🇮🇷', slots: [
    'Team Logo','Alireza Beiranvand','Morteza Pouraliganji','Ehsan Hajsafi','Milad Mohammadi',
    'Shojae Khalilzadeh','Ramin Rezaeian','Hossein Kanaani','Sadegh Moharrami','Saleh Hardani',
    'Saeed Ezatolahi','Saman Ghoddos','Team Photo','Omid Noorafkan','Roozbeh Cheshmi',
    'Mohammad Mohebi','Sardar Azmoun','Mehdi Taremi','Alireza Jahanbakhsh','Ali Gholizadeh'] },
  { name: 'Iraq', code: 'IRQ', flag: '🇮🇶', slots: [
    'Team Logo','Jalal Hassan','Rebin Sulaka','Hussein Ali','Akam Hashem',
    'Merchas Doski','Zaid Tahseen','Manaf Younis','Zidane Iqbal','Amir Al-Ammari',
    'Ibrahim Bayesh','Ali Jasim','Team Photo','Youssef Amyn','Aimar Sher',
    'Marko Farji','Osama Rashid','Ali Al-Hamadi','Aymen Hussein','Mohanad Ali'] },
  { name: 'Ivory Coast', code: 'CIV', flag: '🇨🇮', slots: [
    'Team Logo','Yahia Fofana','Ghislain Konan','Wilfried Singo','Odilon Kossounou',
    'Evan Ndicka','Willy Boly','Emmanuel Agbadou','Ousmane Diomandé','Franck Kessié',
    'Seko Fofana','Ibrahim Sangaré','Team Photo','Jean-Philippe Gbamin','Amad Diallo',
    'Sébastien Haller','Simon Adingra','Yan Diomande','Evann Guessand','Oumar Diakité'] },
  { name: 'Japan', code: 'JPN', flag: '🇯🇵', slots: [
    'Team Logo','Zion Suzuki','Henry Heroki Mochizuki','Ayumu Seko','Junnosuke Suzuki',
    'Shogo Taniguchi','Tsuyoshi Watanabe','Kaishu Sano','Yuki Soma','Ao Tanaka',
    'Daichi Kamada','Takefusa Kubo','Team Photo','Ritsu Doan','Keito Nakamura',
    'Takumi Minamino','Shuto Machino','Junya Ito','Koki Ogawa','Ayase Ueda'] },
  { name: 'Jordan', code: 'JOR', flag: '🇯🇴', slots: [
    'Team Logo','Yazeed Abulaila','Ihsan Haddad','Mohammad Abu Hashish','Yazan Al-Arab',
    'Abdallah Nasib','Saleem Obaid','Mohammad Abualnadi','Ibrahim Saadeh','Nizar Al-Rashdan',
    'Noor Al-Rawabdeh','Mohannad Abu Taha','Team Photo','Amer Jamous','Musa Al-Taamari',
    'Yazan Al-Naimat','Mahmoud Al-Mardi','Ali Olwan','Mohammad Abu Zrayq','Ibrahim Sabra'] },
  { name: 'Mexico', code: 'MEX', flag: '🇲🇽', slots: [
    'Team Logo','Luis Malagón','Johan Vásquez','Jorge Sánchez','César Montes',
    'Jesús Gallardo','Israel Reyes','Diego Lainez','Carlos Rodríguez','Edson Álvarez',
    'Orbelín Pineda','Marcel Ruiz','Team Photo','Érick Sánchez','Hirving Lozano',
    'Santiago Giménez','Raúl Jiménez','Alexis Vega','Roberto Alvarado','César Huerta'] },
  { name: 'Morocco', code: 'MAR', flag: '🇲🇦', slots: [
    'Team Logo','Yassine Bounou','Munir El Kajoui','Achraf Hakimi','Noussair Mazraoui',
    'Nayef Aguerd','Romain Saiss','Jawad El Yamiq','Adam Masina','Sofyan Amrabat',
    'Azzedine Ounahi','Eliesse Ben Seghir','Team Photo','Bilal El Khannouss','Ismael Saibari',
    'Youssef En-Nesyri','Abde Ezzalzouli','Soufiane Rahimi','Brahim Díaz','Ayoub El Kaabi'] },
  { name: 'Netherlands', code: 'NED', flag: '🇳🇱', slots: [
    'Team Logo','Bart Verbruggen','Virgil van Dijk','Micky van de Ven','Jurriën Timber',
    'Denzel Dumfries','Nathan Aké','Jeremie Frimpong','Jan Paul van Hecke','Tijjani Reijnders',
    'Ryan Gravenberch','Teun Koopmeiners','Team Photo','Frenkie de Jong','Xavi Simons',
    'Justin Kluivert','Memphis Depay','Donyell Malen','Wout Weghorst','Cody Gakpo'] },
  { name: 'New Zealand', code: 'NZL', flag: '🇳🇿', slots: [
    'Team Logo','Max Crocombe','Alex Paulsen','Michael Boxall','Liberato Cacace',
    'Tim Payne','Tyler Bindon','Francis de Vries','Finn Surman','Joe Bell',
    'Sarpreet Singh','Ryan Thomas','Team Photo','Matthew Garbett','Marko Stamenić',
    'Ben Old','Chris Wood','Elijah Just','Callum McCowatt','Kosta Barbarouses'] },
  { name: 'Norway', code: 'NOR', flag: '🇳🇴', slots: [
    'Team Logo','Ørjan Nyland','Julian Ryerson','Leo Østigård','Kristoffer Vassbakk Ajer',
    'Marcus Holmgren Pedersen','David Møller Wolfe','Torbjørn Heggem','Morten Thorsby','Martin Ødegaard',
    'Sander Berge','Andreas Schjelderup','Team Photo','Patrick Berg','Erling Haaland',
    'Alexander Sørloth','Aron Dønnum','Jørgen Strand Larsen','Antonio Nusa','Oscar Bobb'] },
  { name: 'Panama', code: 'PAN', flag: '🇵🇦', slots: [
    'Team Logo','Orlando Mosquera','Luis Mejía','Fidel Escobar','Andrés Andrade',
    'Michael Amir Murillo','Eric Davis','José Córdoba','César Blackman','Cristian Martínez',
    'Aníbal Godoy','Adalberto Carrasquilla','Team Photo','Édgar Bárcenas','Carlos Harvey',
    'Ismael Díaz','José Fajardo','Cecilio Waterman','José Luis Rodríguez','Alberto Quintero'] },
  { name: 'Paraguay', code: 'PAR', flag: '🇵🇾', slots: [
    'Team Logo','Roberto Fernández','Orlando Gill','Gustavo Gómez','Fabián Balbuena',
    'Juan José Cáceres','Omar Alderete','Junior Alonso','Mathías Villasanti','Diego Gómez',
    'Damián Bobadilla','Andrés Cubas','Team Photo','Matías Galarza Fonda','Julio Enciso',
    'Alejandro Romero Gamarra','Miguel Almirón','Ramón Sosa','Ángel Romero','Antonio Sanabria'] },
  { name: 'Portugal', code: 'POR', flag: '🇵🇹', slots: [
    'Team Logo','Diogo Costa','José Sá','Rúben Dias','João Cancelo',
    'Diogo Dalot','Nuno Mendes','Gonçalo Inácio','Bernardo Silva','Bruno Fernandes',
    'Rúben Neves','Vitinha','Team Photo','João Neves','Cristiano Ronaldo',
    'Francisco Trincão','João Félix','Gonçalo Ramos','Pedro Neto','Rafael Leão'] },
  { name: 'Qatar', code: 'QAT', flag: '🇶🇦', slots: [
    'Team Logo','Meshaal Barsham','Sultan Al Brake','Lucas Mendes','Homam Ahmed',
    'Boualem Khoukhi','Pedro Miguel','Tarek Salman','Mohamed Al-Mannai','Karim Boudiaf',
    'Assim Madibo','Ahmed Fatehi','Team Photo','Mohammed Waad','Abdulaziz Hatem',
    'Hassan Al-Haydos','Edmilson Junior','Akram Afif','Ahmed Al Ganehi','Almoez Ali'] },
  { name: 'Saudi Arabia', code: 'KSA', flag: '🇸🇦', slots: [
    'Team Logo','Nawaf Alaqidi','Abdulrahman Al-Sanbi','Saud Abdulhamid','Nawaf Bouwashl',
    'Jihad Thakri','Moteb Al-Harbi','Hassan Al-Tambakti','Musab Aljuwayr','Ziyad Aljohani',
    'Abdullah Alkhaibari','Nasser Al-Dawsari','Team Photo','Saleh Abu Alshamat','Marwan Alsahafi',
    'Salem Aldawsari','Abdulrahman Al-Aboud','Feras Al-Brikan','Saleh Al-Shehri','Abdullah Al-Hamdan'] },
  { name: 'Scotland', code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', slots: [
    'Team Logo','Angus Gunn','Jack Hendry','Kieran Tierney','Aaron Hickey',
    'Andrew Robertson','Scott McKenna','John Souttar','Anthony Ralston','Grant Hanley',
    'Scott McTominay','Billy Gilmour','Team Photo','Lewis Ferguson','Ryan Christie',
    'Kenny McLean','John McGinn','Lyndon Dykes','Che Adams','Ben Doak'] },
  { name: 'Senegal', code: 'SEN', flag: '🇸🇳', slots: [
    'Team Logo','Édouard Mendy','Yehvann Diouf','Moussa Niakhaté','Abdoulaye Seck',
    'Ismail Jakobs','El Hadji Malick Diouf','Kalidou Koulibaly','Idrissa Gana Gueye','Pape Matar Sarr',
    'Pape Gueye','Habib Diarra','Team Photo','Lamine Camara','Sadio Mané',
    'Ismaïla Sarr','Boulaye Dia','Iliman Ndiaye','Nicolas Jackson','Krépin Diatta'] },
  { name: 'South Africa', code: 'RSA', flag: '🇿🇦', slots: [
    'Team Logo','Ronwen Williams','Sipho Chaine','Aubrey Modiba','Samukele Kabini',
    'Mbekezeli Mbokazi','Khulumani Ndamane','Siyabonga Ngezana','Khuliso Mudau','Nkosinathi Sibisi',
    'Teboho Mokoena','Thalente Mbatha','Team Photo','Bathusi Aubaas','Yaya Sithole',
    'Sipho Mbule','Lyle Foster','Iqraam Rayners','Mohau Nkota','Oswin Appollis'] },
  { name: 'South Korea', code: 'KOR', flag: '🇰🇷', slots: [
    'Team Logo','Hyeon-woo Jo','Seung-Gyu Kim','Min-jae Kim','Yu-min Cho',
    'Young-woo Seol','Han-beom Lee','Tae-seok Lee','Myung-jae Lee','Jae-sung Lee',
    'In-beom Hwang','Kang-in Lee','Team Photo','Seung-ho Paik','Jens Castrop',
    'Dong-gyeong Lee','Gue-sung Cho','Heung-min Son','Hee-chan Hwang','Hyeon-Gyu Oh'] },
  { name: 'Spain', code: 'ESP', flag: '🇪🇸', slots: [
    'Team Logo','Unai Simón','Robin Le Normand','Aymeric Laporte','Dean Huijsen',
    'Pedro Porro','Dani Carvajal','Marc Cucurella','Martín Zubimendi','Rodri',
    'Pedri','Fabián Ruiz','Team Photo','Mikel Merino','Lamine Yamal',
    'Dani Olmo','Nico Williams','Ferran Torres','Álvaro Morata','Mikel Oyarzabal'] },
  { name: 'Sweden', code: 'SWE', flag: '🇸🇪', slots: [
    'Team Logo','Viktor Johansson','Isak Hien','Gabriel Gudmundsson','Emil Holm',
    'Victor Nilsson Lindelöf','Gustaf Lagerbielke','Lucas Bergvall','Hugo Larsson','Jesper Karlström',
    'Yasin Ayari','Mattias Svanberg','Team Photo','Daniel Svensson','Ken Sema',
    'Roony Bardghji','Dejan Kulusevski','Anthony Elanga','Alexander Isak','Viktor Gyökeres'] },
  { name: 'Switzerland', code: 'SUI', flag: '🇨🇭', slots: [
    'Team Logo','Gregor Kobel','Yvon Mvogo','Manuel Akanji','Ricardo Rodríguez',
    'Nico Elvedi','Aurèle Amenda','Silvan Widmer','Granit Xhaka','Denis Zakaria',
    'Remo Freuler','Fabian Rieder','Team Photo','Ardon Jashari','Johan Manzambi',
    'Michel Aebischer','Breel Embolo','Rúben Vargas','Dan Ndoye','Zeki Amdouni'] },
  { name: 'Tunisia', code: 'TUN', flag: '🇹🇳', slots: [
    'Team Logo','Béchir Ben Saïd','Aymen Dahmen','Yan Valery','Montassar Talbi',
    'Yassine Meriah','Ali Abdi','Dylan Bronn','Ellyes Skhiri','Aïssa Laïdouni',
    'Ferjani Sassi','Mohamed Ali Ben Romdhane','Team Photo','Hannibal Mejbri','Elias Achouri',
    'Elias Saad','Hazem Mastouri','Ismael Gharbi','Sayfallah Ltaief','Naïm Sliti'] },
  { name: 'Türkiye', code: 'TUR', flag: '🇹🇷', slots: [
    'Team Logo','Uğurcan Çakır','Mert Müldür','Zeki Çelik','Abdülkerim Bardakcı',
    'Çağlar Söyüncü','Merih Demiral','Ferdi Kadıoğlu','Kaan Ayhan','İsmail Yüksek',
    'Hakan Çalhanoğlu','Orkun Kökçü','Team Photo','Arda Güler','İrfan Can Kahveci',
    'Yunus Akgün','Can Uzun','Barış Alper Yılmaz','Kerem Aktürkoğlu','Kenan Yıldız'] },
  { name: 'Uruguay', code: 'URU', flag: '🇺🇾', slots: [
    'Team Logo','Sergio Rochet','Santiago Mele','Ronald Araújo','José María Giménez',
    'Sebastián Cáceres','Mathías Olivera','Guillermo Varela','Nahitan Nández','Federico Valverde',
    'Giorgian de Arrascaeta','Rodrigo Bentancur','Team Photo','Manuel Ugarte','Nicolás de la Cruz',
    'Maxi Araújo','Darwin Núñez','Federico Viñas','Rodrigo Aguirre','Facundo Pellistri'] },
  { name: 'USA', code: 'USA', flag: '🇺🇸', slots: [
    'Team Logo','Matt Freese','Chris Richards','Tim Ream','Mark McKenzie',
    'Alex Freeman','Antonee Robinson','Tyler Adams','Tanner Tessmann','Weston McKennie',
    'Christian Roldan','Timothy Weah','Team Photo','Diego Luna','Malik Tillman',
    'Christian Pulisic','Brenden Aaronson','Ricardo Pepi','Haji Wright','Folarin Balogun'] },
  { name: 'Uzbekistan', code: 'UZB', flag: '🇺🇿', slots: [
    'Team Logo','Utkir Yusupov','Farrukh Sayfiev','Sherzod Nasrullaev','Umar Eshmurodov',
    'Husniddin Aliqulov','Rustamjon Ashurmatov','Khojiakbar Alijonov','Abdukodir Khusanov','Odiljon Hamrobekov',
    'Otabek Shukurov','Jamshid Iskanderov','Team Photo','Azizbek Turgunboev','Khojimat Erkinov',
    'Eldor Shomurodov','Oston Urunov','Jaloliddin Masharipov','Igor Sergeev','Abbosbek Fayzullaev'] },
];

function buildCatalogue() {
  const list = [];
  let n = 1;
  INTRO.forEach((s) => list.push({
    number: n++, code: s.code, name: s.name,
    section: 'Introduction', sectionKey: 'intro', flag: '🏆',
    type: 'special', foil: !!s.foil,
  }));
  MUSEUM.forEach((s) => list.push({
    number: n++, code: s.code, name: s.name,
    section: 'FIFA Museum', sectionKey: 'museum', flag: '🏅',
    type: 'museum', foil: !!s.foil,
  }));
  TEAMS.forEach((team) => {
    const sectionKey = `team-${team.code}`;
    team.slots.forEach((label, i) => {
      const slotNum = i + 1;
      let type = 'player';
      let foil = false;
      let displayName = label;
      if (slotNum === 1) { type = 'badge'; foil = true; displayName = `${team.name} — Team Logo`; }
      else if (slotNum === 13) { type = 'photo'; displayName = `${team.name} — Team Photo`; }
      list.push({
        number: n++,
        code: `${team.code}${slotNum}`,
        name: displayName,
        section: team.name,
        sectionKey,
        flag: team.flag,
        type,
        foil,
      });
    });
  });
  return list;
}

const CATALOGUE = buildCatalogue();
const TOTAL_STICKERS = CATALOGUE.length; // 980

const SECTIONS = [
  { key: 'intro',  name: 'Introduction', flag: '🏆' },
  { key: 'museum', name: 'FIFA Museum',  flag: '🏅' },
  ...TEAMS.map((t) => ({ key: `team-${t.code}`, name: t.name, flag: t.flag })),
];

// ============================================================
// STORAGE — Supabase-backed (see ./supabase.js)
// ============================================================

// ============================================================
// FONTS
// ============================================================
function useFonts() {
  useEffect(() => {
    if (document.getElementById('wc-fonts')) return;
    const link = document.createElement('link');
    link.id = 'wc-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,900&family=Manrope:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  useFonts();
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null); // { id, name, joinedAt }
  const [members, setMembers] = useState([]);
  const [collections, setCollections] = useState({});
  const [tab, setTab] = useState('album');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);

  // -------- session bootstrap & subscription --------
  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await getSession();
      if (!mounted) return;
      setSession(s);
      setLoading(false);
    })();
    const off = onAuthChange((s) => {
      setSession(s);
    });
    return () => { mounted = false; off(); };
  }, []);

  // -------- when session present, load community + my member row --------
  useEffect(() => {
    if (!session) { setMe(null); return; }
    let unsubscribe = null;
    let cancelled = false;

    (async () => {
      try {
        const allMembers = await loadMembers();
        const cols = await loadAllCollections();
        if (cancelled) return;
        setMembers(allMembers);
        setCollections(cols);

        const meRow = allMembers.find((m) => m.id === session.user.id);
        if (meRow) setMe(meRow);

        unsubscribe = subscribeToChanges(async () => {
          try {
            const [m2, c2] = await Promise.all([loadMembers(), loadAllCollections()]);
            if (cancelled) return;
            setMembers(m2);
            setCollections(c2);
            const updatedMe = m2.find((m) => m.id === session.user.id);
            if (updatedMe) setMe(updatedMe);
          } catch {}
        });
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('Could not connect to figureasy. Check your connection.');
      }
    })();

    return () => { cancelled = true; if (unsubscribe) unsubscribe(); };
  }, [session]);

  const handleSignOut = async () => {
    await signOut();
    setMe(null);
  };

  const updateSticker = useCallback(async (number, nextCount) => {
    if (!me) return;
    const safe = Math.max(0, Math.min(99, nextCount));
    setCollections((c) => {
      const myCol = { ...(c[me.id] || {}) };
      if (safe === 0) delete myCol[number];
      else myCol[number] = safe;
      return { ...c, [me.id]: myCol };
    });
    try {
      await upsertSticker(me.id, number, safe);
    } catch (e) {
      console.error(e);
      setError('Could not save that change.');
    }
  }, [me]);

  const handleDeleteMember = async (memberId) => {
    try {
      await deleteMember(memberId);
      setMembers((ms) => ms.filter((m) => m.id !== memberId));
      setCollections((c) => {
        const next = { ...c };
        delete next[memberId];
        return next;
      });
    } catch (e) {
      console.error(e);
      setError('Could not delete that member.');
    }
  };

  if (loading) return <Splash message="Opening figureasy…" />;
  if (!session) return <AuthScreen onError={setError} error={error} />;
  if (!me) return <Splash message="Loading your album…" />;

  const myCollection = collections[me.id] || {};

  return (
    <div className="min-h-screen" style={styles.app}>
      <style>{globalCss}</style>
      <Header me={me} myCollection={myCollection} onSignOut={handleSignOut} />
      <Tabs tab={tab} setTab={setTab} />
      <main className="max-w-5xl mx-auto px-4 pb-24">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg flex items-center justify-between gap-2"
               style={{ background: '#fdf3e1', color: '#7a4a00' }}>
            <span className="flex items-center gap-2">
              <AlertCircle size={16} /> <span className="text-sm">{error}</span>
            </span>
            <button onClick={() => setError(null)} className="text-xs underline opacity-70">dismiss</button>
          </div>
        )}
        {tab === 'album' && (
          <AlbumTab myCollection={myCollection} updateSticker={updateSticker} />
        )}
        {tab === 'community' && (
          <CommunityTab me={me} members={members} collections={collections}
                        viewingMember={viewingMember} setViewingMember={setViewingMember} />
        )}
        {tab === 'trades' && (
          <TradesTab me={me} members={members} collections={collections} />
        )}
        {tab === 'settings' && (
          <SettingsTab me={me} members={members} collections={collections}
                       onDeleteMember={handleDeleteMember} />
        )}
      </main>
    </div>
  );
}

// ============================================================
// SPLASH / SETUP / HEADER / TABS
// ============================================================
function Splash({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={styles.app}>
      <style>{globalCss}</style>
      <div className="text-center">
        <Trophy size={36} style={{ color: 'var(--accent)' }} className="mx-auto mb-3" />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)' }}>{message}</p>
      </div>
    </div>
  );
}

function AuthScreen({ onError, error }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(null);

  const submit = async () => {
    setLocalError(null);
    if (!username.trim() || !password) {
      setLocalError('Username and password are required.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUpWithUsername({
          username,
          password,
          displayName: displayName.trim() || username.trim(),
        });
      } else {
        await signInWithUsername({ username, password });
      }
    } catch (e) {
      const msg = e?.message || 'Something went wrong.';
      // Friendlier messages for common cases
      if (/already registered|already exists/i.test(msg)) {
        setLocalError('That username is taken. Try signing in instead.');
      } else if (/invalid login|invalid credentials/i.test(msg)) {
        setLocalError('Wrong username or password.');
      } else {
        setLocalError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10" style={styles.app}>
      <style>{globalCss}</style>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5"
               style={{ background: 'var(--ink)', color: 'var(--cream)' }}>
            <Trophy size={28} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
              className="text-5xl tracking-tight mb-2">Figureasy</h1>
          <p className="uppercase tracking-[0.25em] text-xs"
             style={{ color: 'var(--accent)', fontWeight: 600 }}>
            World Cup 2026 · 980 stickers
          </p>
          <p className="mt-6 text-base leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
            Track your stickers, see what your friends have, and find perfect trades.
          </p>
        </div>

        <div className="rounded-2xl p-6" style={styles.card}>
          {/* Tab switcher */}
          <div className="flex gap-1 rounded-lg p-1 mb-5" style={{ background: '#f0e7d1' }}>
            <button onClick={() => { setMode('signin'); setLocalError(null); }}
                    className="flex-1 py-2 text-sm font-semibold rounded-md transition-colors"
                    style={{
                      background: mode === 'signin' ? 'var(--ink)' : 'transparent',
                      color: mode === 'signin' ? 'var(--cream)' : 'var(--ink-soft)',
                    }}>
              Sign in
            </button>
            <button onClick={() => { setMode('signup'); setLocalError(null); }}
                    className="flex-1 py-2 text-sm font-semibold rounded-md transition-colors"
                    style={{
                      background: mode === 'signup' ? 'var(--ink)' : 'transparent',
                      color: mode === 'signup' ? 'var(--cream)' : 'var(--ink-soft)',
                    }}>
              Create account
            </button>
          </div>

          {mode === 'signup' && (
            <div className="mb-3">
              <label className="block text-xs uppercase tracking-widest mb-1.5"
                     style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>
                Display name (what friends see)
              </label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                     placeholder="e.g. Tommy"
                     className="w-full px-4 py-2.5 rounded-lg border outline-none"
                     style={{ borderColor: 'var(--line)', background: '#fff',
                              fontFamily: 'var(--font-body)', fontSize: 15 }} />
            </div>
          )}

          <div className="mb-3">
            <label className="block text-xs uppercase tracking-widest mb-1.5"
                   style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>
              Username
            </label>
            <input value={username} onChange={(e) => setUsername(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && submit()}
                   placeholder="lowercase, no spaces"
                   autoComplete="username"
                   className="w-full px-4 py-2.5 rounded-lg border outline-none"
                   style={{ borderColor: 'var(--line)', background: '#fff',
                            fontFamily: 'var(--font-body)', fontSize: 15 }}
                   autoFocus />
          </div>

          <div className="mb-4">
            <label className="block text-xs uppercase tracking-widest mb-1.5"
                   style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>
              Password
            </label>
            <div className="relative">
              <input value={password} onChange={(e) => setPassword(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && submit()}
                     type={showPw ? 'text' : 'password'}
                     placeholder="at least 6 characters"
                     autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                     className="w-full px-4 py-2.5 pr-10 rounded-lg border outline-none"
                     style={{ borderColor: 'var(--line)', background: '#fff',
                              fontFamily: 'var(--font-body)', fontSize: 15 }} />
              <button type="button" onClick={() => setShowPw((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--ink-soft)' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {localError && (
            <div className="mb-3 px-3 py-2 rounded-md text-xs flex items-start gap-2"
                 style={{ background: '#fbe4d4', color: '#8a3b1b' }}>
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{localError}</span>
            </div>
          )}

          <button onClick={submit} disabled={busy}
                  className="w-full py-3 rounded-lg font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'var(--ink)', color: 'var(--cream)',
                           fontFamily: 'var(--font-body)' }}>
            {busy ? 'Working…' : (mode === 'signup' ? 'Create account' : 'Sign in')}
          </button>
        </div>

        <p className="text-center mt-8 text-[11px]"
           style={{ color: 'var(--ink-soft)', opacity: 0.55 }}>
          Built by Tommy Carlin · 2026
        </p>
      </div>
    </div>
  );
}

function Header({ me, myCollection, onSignOut }) {
  const stats = computeStats(myCollection);
  return (
    <header className="border-b" style={{ borderColor: 'var(--line)', background: 'var(--cream)' }}>
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
               style={{ background: 'var(--ink)', color: 'var(--cream)' }}>
            <Trophy size={16} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                className="text-xl leading-none">Figureasy</h1>
            <p className="text-[10px] uppercase tracking-widest mt-0.5"
               style={{ color: 'var(--accent)', fontWeight: 600 }}>WC 2026 · 980</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
              {stats.have} / {TOTAL_STICKERS} stickers
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink)' }}
               className="text-lg leading-none">{stats.percent}%</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
               style={{ borderColor: 'var(--line)' }}>
            <User size={14} style={{ color: 'var(--ink-soft)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{me.name}</span>
            <button onClick={onSignOut} title="Sign out">
              <LogOut size={14} style={{ color: 'var(--ink-soft)' }} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Tabs({ tab, setTab }) {
  const items = [
    { key: 'album',     label: 'My Album',  icon: BookOpen },
    { key: 'community', label: 'Community', icon: Users },
    { key: 'trades',    label: 'Trades',    icon: ArrowLeftRight },
    { key: 'settings',  label: 'Settings',  icon: Settings },
  ];
  return (
    <nav className="sticky top-0 z-20 border-b"
         style={{ borderColor: 'var(--line)', background: 'var(--cream)' }}>
      <div className="max-w-5xl mx-auto px-4 flex gap-1">
        {items.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors relative"
                    style={{ color: active ? 'var(--ink)' : 'var(--ink-soft)',
                             fontFamily: 'var(--font-body)' }}>
              <Icon size={15} />
              {label}
              {active && (
                <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t"
                      style={{ background: 'var(--accent)' }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ============================================================
// ALBUM TAB
// ============================================================
function AlbumTab({ myCollection, updateSticker }) {
  const [filter, setFilter] = useState('all');
  const [activeSection, setActiveSection] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return CATALOGUE.filter((s) => {
      const count = myCollection[s.number] || 0;
      if (filter === 'missing' && count > 0) return false;
      if (filter === 'have' && count < 1) return false;
      if (filter === 'extras' && count < 2) return false;
      if (activeSection !== 'all' && s.sectionKey !== activeSection) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.name.toLowerCase().includes(q)
            && !s.code.toLowerCase().includes(q)
            && !s.section.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [myCollection, filter, activeSection, search]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of filtered) {
      if (!map.has(s.sectionKey))
        map.set(s.sectionKey, { section: s.section, flag: s.flag, items: [] });
      map.get(s.sectionKey).items.push(s);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const stats = computeStats(myCollection);

  return (
    <div className="pt-6">
      <div className="rounded-2xl p-5 mb-5" style={styles.card}>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1"
               style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>Album progress</p>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
               className="text-4xl leading-none">
              {stats.have}{' '}
              <span style={{ color: 'var(--ink-soft)' }} className="text-2xl">/ {TOTAL_STICKERS}</span>
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <Stat label="In album" value={stats.have} accent="var(--ink)" />
            <Stat label="Extras" value={stats.extras} accent="var(--accent)" />
            <Stat label="Missing" value={stats.missing} accent="#b85c3c" />
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: '#e9e0cf' }}>
          <div className="h-full rounded-full transition-all"
               style={{ width: `${stats.percent}%`, background: 'var(--ink)' }} />
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--ink-soft)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search Messi, MEX17, Brazil…"
                 className="w-full pl-9 pr-9 py-2.5 rounded-lg border outline-none text-sm"
                 style={{ borderColor: 'var(--line)', background: '#fff',
                          fontFamily: 'var(--font-body)' }} />
          {search && (
            <button onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2">
              <X size={14} style={{ color: 'var(--ink-soft)' }} />
            </button>
          )}
        </div>
        <div className="flex gap-1 rounded-lg border p-1" style={{ borderColor: 'var(--line)' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'have', label: 'Have' },
            { key: 'missing', label: 'Missing' },
            { key: 'extras', label: 'Extras' },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
                    className="px-3 py-1.5 text-xs font-semibold rounded transition-colors"
                    style={{ background: filter === f.key ? 'var(--ink)' : 'transparent',
                             color: filter === f.key ? 'var(--cream)' : 'var(--ink-soft)' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 mb-5">
        <div className="flex gap-2 pb-1" style={{ minWidth: 'max-content' }}>
          <SectionPill active={activeSection === 'all'} onClick={() => setActiveSection('all')}
                       label="All sections" flag="📚" />
          {SECTIONS.map((s) => (
            <SectionPill key={s.key} active={activeSection === s.key}
                         onClick={() => setActiveSection(s.key)}
                         label={s.name} flag={s.flag} />
          ))}
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--ink-soft)' }}>
          <Sparkles size={20} className="mx-auto mb-2" />
          <p className="text-sm">No stickers match your filters.</p>
        </div>
      )}

      {grouped.map(([key, { section, flag, items }]) => {
        const sectionTotal = CATALOGUE.filter((c) => c.sectionKey === key).length;
        const sectionHave = CATALOGUE.filter((c) => c.sectionKey === key && (myCollection[c.number] || 0) > 0).length;
        return (
          <section key={key} className="mb-8">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-2xl">{flag}</span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                  className="text-2xl">{section}</h2>
              <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                {sectionHave} / {sectionTotal}
              </span>
            </div>
            <div className="grid gap-2"
                 style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {items.map((s) => (
                <StickerCard key={s.number} sticker={s}
                             count={myCollection[s.number] || 0}
                             onChange={(c) => updateSticker(s.number, c)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SectionPill({ active, onClick, label, flag }) {
  return (
    <button onClick={onClick}
            className="px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors"
            style={{ background: active ? 'var(--ink)' : 'transparent',
                     color: active ? 'var(--cream)' : 'var(--ink-soft)',
                     border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}` }}>
      <span>{flag}</span>{label}
    </button>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="text-right">
      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: accent }}
         className="text-2xl leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-widest mt-1"
         style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>{label}</p>
    </div>
  );
}

function StickerCard({ sticker, count, onChange }) {
  const status = count === 0 ? 'missing' : count === 1 ? 'have' : 'extras';
  const styleByStatus = {
    missing: { bg: '#fff', border: 'var(--line)', tag: '#b85c3c' },
    have:    { bg: '#f5efe1', border: '#d9caa3', tag: 'var(--ink)' },
    extras:  { bg: '#fbe9c7', border: 'var(--accent)', tag: 'var(--accent)' },
  }[status];

  return (
    <div className="rounded-xl p-3 transition-all"
         style={{ background: styleByStatus.bg, border: `1px solid ${styleByStatus.border}` }}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded font-bold"
              style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--ink)' }}>
          {sticker.code}
        </span>
        <div className="flex items-center gap-1">
          {sticker.foil && <Sparkles size={12} style={{ color: 'var(--accent)' }} />}
          <span className="text-base">{sticker.flag}</span>
        </div>
      </div>
      <p className="text-xs leading-tight mb-1 min-h-[2.2em]"
         style={{ color: 'var(--ink)', fontWeight: 500 }}>
        {sticker.name}
      </p>
      <p className="text-[10px] mb-2 font-mono" style={{ color: 'var(--ink-soft)' }}>
        #{String(sticker.number).padStart(3, '0')}
      </p>

      <div className="flex items-center justify-between">
        {count === 0 ? (
          <button onClick={() => onChange(1)}
                  className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors"
                  style={{ background: 'var(--ink)', color: 'var(--cream)' }}>
            + Add
          </button>
        ) : (
          <div className="flex items-center justify-between w-full gap-1">
            <button onClick={() => onChange(count - 1)}
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ background: '#fff', border: `1px solid ${styleByStatus.border}` }}>
              <Minus size={12} />
            </button>
            <div className="flex items-center gap-1.5">
              {count === 1
                ? <Check size={14} style={{ color: styleByStatus.tag }} />
                : <Star size={14} style={{ color: styleByStatus.tag, fill: styleByStatus.tag }} />}
              <span className="text-sm font-bold" style={{ color: styleByStatus.tag }}>
                {count === 1 ? 'In album' : `+${count - 1} extra${count > 2 ? 's' : ''}`}
              </span>
            </div>
            <button onClick={() => onChange(count + 1)}
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ background: '#fff', border: `1px solid ${styleByStatus.border}` }}>
              <Plus size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMMUNITY TAB
// ============================================================
function CommunityTab({ me, members, collections, viewingMember, setViewingMember }) {
  const member = viewingMember ? members.find((m) => m.id === viewingMember) : null;
  useEffect(() => {
    if (viewingMember && !member) setViewingMember(null);
  }, [viewingMember, member, setViewingMember]);

  if (viewingMember && member) {
    return (
      <MemberDetail member={member} collection={collections[member.id] || {}}
                    onBack={() => setViewingMember(null)}
                    myCollection={collections[me.id] || {}} />
    );
  }

  const sorted = [...members].sort((a, b) => {
    const sa = computeStats(collections[a.id] || {}).have;
    const sb = computeStats(collections[b.id] || {}).have;
    return sb - sa;
  });

  return (
    <div className="pt-6">
      <div className="mb-6">
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
            className="text-3xl mb-1">The collectors</h2>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          {members.length} {members.length === 1 ? 'person is' : 'people are'} chasing figureasy.
        </p>
      </div>
      <div className="space-y-3">
        {sorted.map((m, i) => {
          const stats = computeStats(collections[m.id] || {});
          const isMe = m.id === me.id;
          return (
            <button key={m.id} onClick={() => setViewingMember(m.id)}
                    className="w-full text-left rounded-xl p-4 flex items-center gap-4 transition-all hover:translate-x-0.5"
                    style={styles.card}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                   style={{ background: i === 0 ? 'var(--accent)' : 'var(--ink)',
                            color: 'var(--cream)', fontFamily: 'var(--font-display)' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : m.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                      className="text-lg">{m.name}</h3>
                  {isMe && (
                    <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--accent)', color: 'var(--cream)', fontWeight: 600 }}>
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--ink-soft)' }}>
                  <span>{stats.have} in album</span>
                  <span>·</span>
                  <span>{stats.extras} extras</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: '#e9e0cf' }}>
                  <div className="h-full rounded-full"
                       style={{ width: `${stats.percent}%`, background: 'var(--ink)' }} />
                </div>
              </div>
              <div className="text-right">
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                   className="text-2xl leading-none">{stats.percent}%</p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--ink-soft)' }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MemberDetail({ member, collection, onBack, myCollection }) {
  const stats = computeStats(collection);
  const theirExtras = CATALOGUE.filter((s) => (collection[s.number] || 0) >= 2);
  const theirMissing = CATALOGUE.filter((s) => !(collection[s.number] > 0));
  const goodForMe = theirExtras.filter((s) => !(myCollection[s.number] > 0));

  return (
    <div className="pt-6">
      <button onClick={onBack} className="text-sm mb-4 inline-flex items-center gap-1"
              style={{ color: 'var(--ink-soft)' }}>← Back to community</button>
      <div className="rounded-2xl p-6 mb-5" style={styles.card}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
            className="text-3xl mb-1">{member.name}</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
          {stats.have}/{TOTAL_STICKERS} stickers · {stats.extras} extras · {stats.percent}% complete
        </p>
        {goodForMe.length > 0 && (
          <div className="px-4 py-3 rounded-lg flex items-start gap-3"
               style={{ background: '#fbe9c7', border: '1px solid var(--accent)' }}>
            <Sparkles size={18} style={{ color: 'var(--accent)', marginTop: 2 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {member.name} has {goodForMe.length} extra{goodForMe.length === 1 ? '' : 's'} you need!
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                Check the Trades tab for the full breakdown.
              </p>
            </div>
          </div>
        )}
      </div>
      <h3 className="text-xs uppercase tracking-widest mb-3"
          style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>
        {member.name}'s extras ({theirExtras.length})
      </h3>
      {theirExtras.length === 0
        ? <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>No extras tracked yet.</p>
        : <StickerListCompact list={theirExtras} myCollection={myCollection} highlightNeeded />}

      <h3 className="text-xs uppercase tracking-widest mb-3 mt-8"
          style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>
        Missing from their album ({theirMissing.length})
      </h3>
      <StickerListCompact list={theirMissing.slice(0, 60)} myCollection={myCollection} mode="missing" />
      {theirMissing.length > 60 && (
        <p className="text-xs mt-3" style={{ color: 'var(--ink-soft)' }}>
          Showing first 60 of {theirMissing.length}. Use Trades tab for matched suggestions.
        </p>
      )}
    </div>
  );
}

function StickerListCompact({ list, myCollection, highlightNeeded, mode }) {
  return (
    <div className="grid gap-1.5"
         style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
      {list.map((s) => {
        const myCount = myCollection[s.number] || 0;
        const iNeedThis = highlightNeeded && myCount === 0;
        const iCanOffer = mode === 'missing' && myCount >= 2;
        return (
          <div key={s.number}
               className="px-2.5 py-2 rounded-lg text-xs flex items-center gap-2"
               style={{ background: iNeedThis || iCanOffer ? '#fbe9c7' : '#fff',
                        border: `1px solid ${iNeedThis || iCanOffer ? 'var(--accent)' : 'var(--line)'}` }}>
            <span className="font-mono text-[10px] font-bold w-12"
                  style={{ color: 'var(--ink)' }}>{s.code}</span>
            <span className="flex-1 truncate" style={{ color: 'var(--ink)' }}>
              {s.flag} {s.name}
            </span>
            {(iNeedThis || iCanOffer) && (
              <Sparkles size={11} style={{ color: 'var(--accent)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// TRADES TAB
// ============================================================
function TradesTab({ me, members, collections }) {
  const myCol = collections[me.id] || {};
  const others = members.filter((m) => m.id !== me.id);

  const matches = others.map((m) => {
    const theirCol = collections[m.id] || {};
    const theyCanGiveMe = [];
    const iCanGiveThem = [];
    for (const s of CATALOGUE) {
      const myC = myCol[s.number] || 0;
      const thC = theirCol[s.number] || 0;
      if (thC >= 2 && myC === 0) theyCanGiveMe.push(s);
      if (myC >= 2 && thC === 0) iCanGiveThem.push(s);
    }
    const matched = Math.min(theyCanGiveMe.length, iCanGiveThem.length);
    return { member: m, theyCanGiveMe, iCanGiveThem, matched };
  }).sort((a, b) => b.matched - a.matched);

  if (others.length === 0) {
    return (
      <div className="pt-12 text-center">
        <Users size={28} style={{ color: 'var(--ink-soft)' }} className="mx-auto mb-3" />
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
            className="text-2xl mb-1">No trade partners yet</h3>
        <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--ink-soft)' }}>
          Share this app with friends so you can see who has the stickers you need.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-6">
      <div className="mb-6">
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
            className="text-3xl mb-1">Best trades for you</h2>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Sorted by win-win matches — both of you fill gaps.
        </p>
      </div>
      <div className="space-y-4">
        {matches.map(({ member, theyCanGiveMe, iCanGiveThem, matched }) => (
          <TradeCard key={member.id} member={member}
                     theyCanGiveMe={theyCanGiveMe} iCanGiveThem={iCanGiveThem}
                     matched={matched} />
        ))}
      </div>
    </div>
  );
}

function TradeCard({ member, theyCanGiveMe, iCanGiveThem, matched }) {
  const [expanded, setExpanded] = useState(false);
  const hasMatches = matched > 0;
  return (
    <div className="rounded-xl overflow-hidden" style={styles.card}>
      <button onClick={() => setExpanded((e) => !e)}
              className="w-full p-5 text-left flex items-center gap-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
             style={{ background: hasMatches ? 'var(--accent)' : '#d6c9ad',
                      color: 'var(--cream)', fontFamily: 'var(--font-display)' }}>
          {member.name[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
              className="text-xl mb-1">{member.name}</h3>
          {hasMatches ? (
            <p className="text-sm" style={{ color: 'var(--ink)' }}>
              <strong style={{ color: 'var(--accent)' }}>{matched}</strong> mutual swap{matched === 1 ? '' : 's'} possible
              <span style={{ color: 'var(--ink-soft)' }}>
                {' · '}{theyCanGiveMe.length} for you, {iCanGiveThem.length} for them
              </span>
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
              No mutual matches yet — keep updating your album.
            </p>
          )}
        </div>
        <ChevronRight size={18}
                      style={{ color: 'var(--ink-soft)',
                               transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                               transition: 'transform 0.2s' }} />
      </button>
      {expanded && (
        <div className="px-5 pb-5 grid md:grid-cols-2 gap-5 border-t pt-4"
             style={{ borderColor: 'var(--line)' }}>
          <div>
            <p className="text-xs uppercase tracking-widest mb-3"
               style={{ color: 'var(--accent)', fontWeight: 600 }}>
              ← {member.name} can give you ({theyCanGiveMe.length})
            </p>
            {theyCanGiveMe.length === 0
              ? <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                  None of {member.name}'s extras are useful for you right now.
                </p>
              : <div className="space-y-1">
                  {theyCanGiveMe.slice(0, 30).map((s) => <StickerLine key={s.number} sticker={s} />)}
                  {theyCanGiveMe.length > 30 && (
                    <p className="text-xs pt-1" style={{ color: 'var(--ink-soft)' }}>
                      + {theyCanGiveMe.length - 30} more
                    </p>
                  )}
                </div>}
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest mb-3"
               style={{ color: 'var(--accent)', fontWeight: 600 }}>
              You can give → {member.name} ({iCanGiveThem.length})
            </p>
            {iCanGiveThem.length === 0
              ? <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                  You don't have any extras {member.name} needs.
                </p>
              : <div className="space-y-1">
                  {iCanGiveThem.slice(0, 30).map((s) => <StickerLine key={s.number} sticker={s} />)}
                  {iCanGiveThem.length > 30 && (
                    <p className="text-xs pt-1" style={{ color: 'var(--ink-soft)' }}>
                      + {iCanGiveThem.length - 30} more
                    </p>
                  )}
                </div>}
          </div>
        </div>
      )}
    </div>
  );
}

function StickerLine({ sticker }) {
  return (
    <div className="px-3 py-1.5 rounded-md text-sm flex items-center gap-2"
         style={{ background: '#faf6ed' }}>
      <span className="font-mono text-[11px] font-bold w-12"
            style={{ color: 'var(--ink)' }}>{sticker.code}</span>
      <span className="text-base">{sticker.flag}</span>
      <span className="text-[13px] truncate" style={{ color: 'var(--ink)' }}>
        {sticker.name}
      </span>
    </div>
  );
}

// ============================================================
// SETTINGS TAB
// ============================================================
function SettingsTab({ me, members, collections, onDeleteMember }) {
  const [confirmId, setConfirmId] = useState(null);
  const others = members.filter((m) => m.id !== me.id);

  return (
    <div className="pt-6">
      <div className="mb-6">
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
            className="text-3xl mb-1">Settings</h2>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Manage the community.
        </p>
      </div>

      <div className="rounded-xl p-5 mb-6" style={styles.card}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
            className="text-xl mb-1">Your account</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
          Signed in as <strong style={{ color: 'var(--ink)' }}>{me.name}</strong>
        </p>
      </div>

      <div className="rounded-xl p-5" style={styles.card}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
            className="text-xl mb-1">Clean up the community</h3>
        <p className="text-sm mb-5" style={{ color: 'var(--ink-soft)' }}>
          Remove old test accounts or duplicates. This deletes their entire collection too — it can't be undone.
        </p>

        {others.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--ink-soft)' }}>
            No other members yet.
          </p>
        ) : (
          <div className="space-y-2">
            {others.map((m) => {
              const stats = computeStats(collections[m.id] || {});
              const isConfirming = confirmId === m.id;
              return (
                <div key={m.id}
                     className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                     style={{ background: '#faf6ed', border: '1px solid var(--line)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                       style={{ background: 'var(--ink)', color: 'var(--cream)',
                                fontFamily: 'var(--font-display)' }}>
                    {m.name[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate"
                       style={{ color: 'var(--ink)' }}>{m.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--ink-soft)' }}>
                      {stats.have} stickers · {stats.extras} extras
                    </p>
                  </div>
                  {isConfirming ? (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { onDeleteMember(m.id); setConfirmId(null); }}
                              className="text-xs font-semibold px-3 py-1.5 rounded-md"
                              style={{ background: '#b85c3c', color: '#fff' }}>
                        Yes, delete
                      </button>
                      <button onClick={() => setConfirmId(null)}
                              className="text-xs px-3 py-1.5 rounded-md border"
                              style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(m.id)}
                            title="Remove this member"
                            className="p-2 rounded-md hover:bg-white transition-colors">
                      <Trash2 size={15} style={{ color: '#b85c3c' }} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-center mt-10 text-[11px]"
         style={{ color: 'var(--ink-soft)', opacity: 0.55 }}>
        Built by Tommy Carlin · 2026
      </p>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================
function computeStats(collection) {
  let have = 0, extras = 0;
  for (const s of CATALOGUE) {
    const c = collection[s.number] || 0;
    if (c >= 1) have++;
    if (c >= 2) extras += (c - 1);
  }
  const missing = TOTAL_STICKERS - have;
  const percent = Math.round((have / TOTAL_STICKERS) * 100);
  return { have, extras, missing, percent };
}

const styles = {
  app: { background: 'var(--cream)', color: 'var(--ink)',
         fontFamily: 'var(--font-body)', minHeight: '100vh' },
  card: { background: '#fffdf6', border: '1px solid var(--line)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.02)' },
};

const globalCss = `
  :root {
    --cream: #f7f1e3;
    --ink: #1f3a2e;
    --ink-soft: #6e6855;
    --accent: #c08a3c;
    --line: #e4dbc4;
    --font-display: 'Fraunces', Georgia, serif;
    --font-body: 'Manrope', system-ui, -apple-system, sans-serif;
  }
  body { background: var(--cream); }
  input:focus { border-color: var(--ink) !important; }
  button { cursor: pointer; }
  ::selection { background: var(--accent); color: white; }
`;
