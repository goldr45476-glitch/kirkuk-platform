-- =====================================================================
-- Seed data: realistic Kirkuk demo content. Safe to re-run on empty DB.
-- Coordinates are approximate neighbourhood centres; business names are
-- fictional demo data.
-- =====================================================================

insert into public.districts (slug, name_ar, name_ku, name_tr, name_en, lat, lng, sort_order) values
 ('wasiti',   'الواسطي',    'واسیتی',     'Vasıtı',     'Al-Wasiti',   35.4790, 44.4050, 1),
 ('rahimawa', 'رحيم آوا',   'ڕەحیم ئاوا', 'Rahim Ava',  'Rahim Awa',   35.4620, 44.4180, 2),
 ('askari',   'العسكري',    'عەسکەری',    'Askeri',     'Al-Askari',   35.4730, 44.3800, 3),
 ('musalla',  'المصلى',     'موسەڵا',     'Musalla',    'Al-Musalla',  35.4660, 44.3930, 4),
 ('asri',     'الحي العصري','عەسری',      'Asri',       'Al-Asri',     35.4880, 44.3990, 5),
 ('shorja',   'شورجة',      'شۆرجە',      'Şorca',      'Shorja',      35.4685, 44.3955, 6),
 ('qoriya',   'القورية',    'قوریە',      'Kurya',      'Al-Qouriya',  35.4700, 44.3880, 7),
 ('tisin',    'تسعين',      'تیسعین',     'Tisin',      'Tisin',       35.4460, 44.3720, 8),
 ('azadi',    'آزادي',      'ئازادی',     'Azadi',      'Azadi',       35.4900, 44.4200, 9),
 ('domiz',    'دوميز',      'دۆمیز',      'Domiz',      'Domiz',       35.4510, 44.3600, 10),
 ('iskan',    'الإسكان',    'ئیسکان',     'İskan',      'Al-Iskan',    35.4580, 44.4300, 11),
 ('qala',     'القلعة',     'قەڵا',       'Kale',       'The Citadel', 35.4675, 44.3918, 12),
 ('rayan',    'الرياض',     'ڕیاز',       'Riyad',      'Al-Riyadh',   35.4800, 44.3700, 13),
 ('nishtiman','نيشتمان',    'نیشتمان',    'Neştiman',   'Nishtiman',   35.5000, 44.4100, 14);

-- Top-level categories --------------------------------------------------
insert into public.categories (slug, name_ar, name_ku, name_tr, name_en, icon, color, sort_order) values
 ('shops',       'محلات السوق',        'دوکانەکانی بازاڕ',   'Çarşı Dükkanları',   'Market Shops',     'Store',          '#0ea5e9', 1),
 ('food',        'مطاعم وكافيهات',     'چێشتخانە و کافێ',    'Restoranlar & Kafeler','Food & Cafés',   'UtensilsCrossed','#f97316', 2),
 ('malls',       'المولات',            'مۆڵەکان',            'AVM''ler',            'Malls',            'ShoppingBag',    '#a855f7', 3),
 ('health',      'الصحة',              'تەندروستی',          'Sağlık',             'Health',           'Stethoscope',    '#ef4444', 4),
 ('pharmacies',  'الصيدليات',          'دەرمانخانەکان',      'Eczaneler',          'Pharmacies',       'Pill',           '#10b981', 5),
 ('car-services','صيانة السيارات',     'چاکسازی ئۆتۆمبێل',   'Oto Servis',         'Car Services',     'Wrench',         '#64748b', 6),
 ('motors',      'الماطورات والدراجات','مۆتۆر و پاسکیل',     'Motosikletler',      'Motorbikes',       'Bike',           '#eab308', 7),
 ('real-estate', 'العقارات',           'خانووبەرە',          'Emlak',              'Real Estate',      'Building2',      '#14b8a6', 8),
 ('water',       'محطات الماء',        'وێستگەکانی ئاو',     'Su İstasyonları',    'Water Stations',   'Droplets',       '#06b6d4', 9),
 ('fuel',        'محطات البنزين',      'وێستگەی بەنزین',     'Akaryakıt',          'Fuel Stations',    'Fuel',           '#dc2626', 10),
 ('education',   'مدارس ومعاهد',       'قوتابخانە و پەیمانگا','Okullar & Kurslar', 'Schools & Institutes','GraduationCap','#6366f1', 11),
 ('crafts',      'المهن والحرفيون',    'پیشە و کرێکاران',    'Esnaf & Ustalar',    'Trades & Crafts',  'Hammer',         '#d97706', 12),
 ('government',  'خدمات حكومية',       'خزمەتگوزاری حکومی',  'Kamu Hizmetleri',    'Government',       'Landmark',       '#475569', 13),
 ('jobs',        'وظائف',              'کار',                'İş İlanları',        'Jobs',             'Briefcase',      '#2563eb', 14),
 ('other',       'أخرى',               'هی تر',              'Diğer',              'Other',            'Grid2x2',        '#78716c', 15);

-- Sub-categories --------------------------------------------------------
with p as (select id, slug from public.categories)
insert into public.categories (parent_id, slug, name_ar, name_en, icon, sort_order)
select p.id, v.slug, v.name_ar, v.name_en, v.icon, v.ord from p join (values
 ('shops','clothes','ملابس وأزياء','Clothing','Shirt',1),
 ('shops','electronics','إلكترونيات وموبايلات','Electronics & Phones','Smartphone',2),
 ('shops','groceries','مواد غذائية وبقالة','Groceries','ShoppingBasket',3),
 ('shops','gold','ذهب ومجوهرات','Gold & Jewellery','Gem',4),
 ('shops','furniture','أثاث ومفروشات','Furniture','Sofa',5),
 ('food','restaurants','مطاعم','Restaurants','UtensilsCrossed',1),
 ('food','cafes','كافيهات','Cafés','Coffee',2),
 ('food','bakeries','أفران وحلويات','Bakeries & Sweets','Croissant',3),
 ('food','fastfood','وجبات سريعة','Fast Food','Sandwich',4),
 ('health','hospitals','مستشفيات','Hospitals','Hospital',1),
 ('health','clinics','عيادات','Clinics','Stethoscope',2),
 ('health','labs','مختبرات','Laboratories','FlaskConical',3),
 ('health','dentists','أسنان','Dentists','Smile',4),
 ('car-services','mechanics','ورش ميكانيك','Mechanics','Wrench',1),
 ('car-services','tires','إطارات وبنجر','Tyres','CircleDot',2),
 ('car-services','car-wash','غسيل سيارات','Car Wash','SprayCan',3),
 ('car-services','spare-parts','قطع غيار','Spare Parts','Cog',4),
 ('car-services','used-cars','معارض سيارات','Car Dealers','Car',5),
 ('education','schools','مدارس أهلية','Private Schools','School',1),
 ('education','institutes','معاهد ودورات','Institutes & Courses','BookOpen',2),
 ('education','kindergartens','رياض أطفال','Kindergartens','Baby',3),
 ('crafts','electricians','كهربائي','Electricians','Zap',1),
 ('crafts','plumbers','سباك','Plumbers','Pipette',2),
 ('crafts','carpenters','نجار','Carpenters','Ruler',3),
 ('crafts','painters','صباغ','Painters','PaintRoller',4),
 ('crafts','ac-repair','تبريد وتكييف','AC & Cooling','Snowflake',5),
 ('government','civil-status','الأحوال المدنية','Civil Status','IdCard',1),
 ('government','municipality','البلدية','Municipality','Building',2),
 ('government','utilities','الكهرباء والماء','Utilities','Plug',3)
) as v(parent, slug, name_ar, name_en, icon, ord) on p.slug = v.parent;

-- Plans -----------------------------------------------------------------
insert into public.plans (code, name_ar, name_en, price_iqd, duration_days, features, is_featured_tier, sort_order) values
 ('free',    'مجانية',   'Free',     0,     3650, '{"ar":["صفحة نشاط أساسية","حتى 5 صور","عرض واحد فعّال"],"en":["Basic business page","Up to 5 photos","1 active offer at a time"]}', false, 1),
 ('pro',     'احترافية', 'Pro',      25000, 30,   '{"ar":["أولوية في المراجعة والتوثيق","صور غير محدودة","عروض غير محدودة","إحصائيات كاملة"],"en":["Priority review & verification","Unlimited photos","Unlimited offers","Full analytics"]}', false, 2),
 ('featured','مميزة',    'Featured', 60000, 30,   '{"ar":["كل مزايا الاحترافية","ظهور أعلى النتائج","شارة «مميز»","ظهور في المساحات الممولة"],"en":["Everything in Pro","Top of search results","Featured badge","Shown in sponsored slots"]}', true, 3);

