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
 ('free',    'مجانية', 'Free',     0,      3650, '["صفحة نشاط أساسية","5 صور","منشور واحد يومياً"]', false, 1),
 ('pro',     'احترافية','Pro',     25000,  30,   '["شارة موثّق","صور غير محدودة","إحصائيات متقدمة","منشورات غير محدودة"]', false, 2),
 ('featured','مميزة',   'Featured',60000,  30,   '["كل مزايا الاحترافية","ظهور أعلى النتائج","شارة مميز","ظهور في الخلاصة"]', true, 3);

-- Businesses (demo) -----------------------------------------------------
create temp table _biz (slug text, cat text, dist text, name text, descr text, phone text, addr text,
                        dlat float8, dlng float8, verified bool, featured bool, hours text) on commit drop;
insert into _biz values
 ('mutaam-al-qala',  'restaurants','qala',    'مطعم القلعة للمشويات', 'أشهر مشويات كركوك: كباب، تكة، ومقبلات شرقية على الفحم منذ 1995.', '07701000001','شارع القلعة، قرب باب الساعة', 0.0003, 0.0005, true,  true,  '11:00-23:30'),
 ('kabab-shorja',    'restaurants','shorja',  'كباب شورجة',           'كباب كركوكي أصيل مع الخبز الحار والسلطات.', '07701000002','سوق الشورجة الرئيسي',        0.0004,-0.0006, true,  false, '10:00-22:00'),
 ('cafe-citadel',    'cafes',      'qala',    'كافيه الأرجيلة والشاي','جلسة تراثية بالقرب من القلعة: شاي كركوكي وقهوة عربية.', '07701000003','أسفل القلعة',                 -0.0004,0.0004, false, false, '08:00-01:00'),
 ('cafe-asri',       'cafes',      'asri',    'ركن القهوة - العصري',  'قهوة مختصة وحلويات منزلية وواي فاي مجاني.', '07701000004','الحي العصري، الشارع العام', 0.0005, 0.0003, true,  true,  '08:00-00:00'),
 ('burger-wasiti',   'fastfood',   'wasiti',  'برغر الواسطي',         'برغر وشاورما وبطاطا مع توصيل سريع داخل المدينة.', '07701000005','حي الواسطي، شارع 60',       0.0002,-0.0004, false, false, '12:00-02:00'),
 ('afran-kirkuk',    'bakeries',   'musalla', 'أفران كركوك الحجري',   'صمّون حجري وكليچة وحلويات العيد.', '07701000006','المصلى، قرب الجامع',        -0.0003,0.0002, false, false, '05:00-22:00'),
 ('lc-electronics',  'electronics','shorja',  'مركز التقنية للموبايلات','أحدث الهواتف والإكسسوارات مع صيانة وضمان.', '07701000007','شورجة، مجمع الأمين',       0.0006, 0.0002, true,  false, '09:00-21:00'),
 ('gold-qaysariya',  'gold',       'shorja',  'ذهب القيصرية',         'ذهب عيار 21 و18 وتصاميم عصرية وهدايا.', '07701000008','قيصرية كركوك',             -0.0002,-0.0003, true,  true,  '09:30-20:00'),
 ('bayt-athath',     'furniture',  'iskan',   'معرض بيت الأثاث',      'غرف نوم وصالونات بأسعار مناسبة وتوصيل وتركيب.', '07701000009','الإسكان، الشارع التجاري',  0.0003, 0.0004, false, false, '09:00-20:00'),
 ('azadi-mall',      'malls',      'azadi',   'آزادي مول',            'مول عائلي: ملابس، مطاعم، ألعاب أطفال ومواقف واسعة.', '07701000010','آزادي، الطريق الرئيسي',   0.0004,-0.0002, true,  true,  '10:00-23:00'),
 ('kirkuk-mall',     'malls',      'wasiti',  'كركوك سيتي مول',       'تسوق وسينما ومنطقة طعام.', '07701000011','الواسطي، طريق بغداد',        -0.0005,0.0006, true,  false, '10:00-23:00'),
 ('hospital-azadi',  'hospitals',  'azadi',   'مستشفى آزادي التعليمي','طوارئ على مدار الساعة وأقسام باطنية وجراحية وأطفال.', '07701000012','آزادي، قرب الدائرة الصحية', 0.0008, 0.0006, true,  false, '00:00-00:00'),
 ('clinic-asri',     'clinics',    'asri',    'عيادة د. سارة - نسائية','استشارات نسائية وولادة وسونار بإشراف أخصائية.', '07701000013','العصري، عمارة الشفاء',     0.0002,-0.0005, true,  false, '16:00-21:00'),
 ('lab-shifa',       'labs',       'rahimawa','مختبر الشفاء التحليلي','تحاليل دم وهرمونات ونتائج سريعة وخدمة سحب منزلية.', '07701000014','رحيم آوا، شارع المدارس',  0.0003, 0.0003, true,  false, '07:30-20:00'),
 ('dental-smile',    'dentists',   'wasiti',  'مركز ابتسامة لطب الأسنان','زراعة وتقويم وتجميل الأسنان بأحدث الأجهزة.', '07701000015','الواسطي، شارع الأطباء',   -0.0003,-0.0002, false, false, '15:00-21:00'),
 ('pharm-amal',      'pharmacies', 'asri',    'صيدلية الأمل',         'أدوية ومستلزمات طبية وحليب أطفال، خدمة توصيل.', '07701000016','العصري، مقابل المصرف',     0.0004, 0.0001, true,  false, '08:00-23:00'),
 ('pharm-noor',      'pharmacies', 'rahimawa','صيدلية النور',         'صيدلية متكاملة وقياس ضغط وسكر مجاناً.', '07701000017','رحيم آوا، السوق',          -0.0002,0.0004, true,  false, '08:00-22:00'),
 ('pharm-shifa24',   'pharmacies', 'musalla', 'صيدلية الحياة 24 ساعة','تعمل على مدار الساعة طوال أيام الأسبوع.', '07701000018','المصلى، الشارع العام',    0.0001,-0.0003, false, false, '00:00-00:00'),
 ('pharm-qoriya',    'pharmacies', 'qoriya',  'صيدلية القورية',       'أدوية ومكملات غذائية ومستحضرات تجميل.', '07701000019','القورية، قرب السوق',       0.0003,-0.0001, false, false, '09:00-22:00'),
 ('workshop-askari', 'mechanics',  'askari',  'ورشة العسكري للسيارات','ميكانيك وكهرباء وفحص كمبيوتر لجميع الأنواع.', '07701000020','العسكري، الشارع الصناعي', 0.0005, 0.0006, true,  false, '08:00-19:00'),
 ('tire-alamin',     'tires',      'tisin',   'إطارات الأمين',        'إطارات جديدة ومستعملة، وزن ووزنة وبنجر.', '07701000021','تسعين، طريق الموصل',      -0.0004,0.0003, false, false, '07:00-21:00'),
 ('carwash-pearl',   'car-wash',   'azadi',   'غسيل اللؤلؤة',         'غسيل وتلميع وتنظيف داخلي بالبخار.', '07701000022','آزادي، قرب الدوار',        0.0002, 0.0007, false, false, '08:00-20:00'),
 ('motors-kirkuk',   'used-cars',  'tisin',   'معرض كركوك للسيارات',  'سيارات مستعملة وجديدة بأقساط ميسرة.', '07701000023','تسعين، شارع المعارض',     0.0006,-0.0003, true,  true,  '09:00-20:00'),
 ('moto-speed',      'motors',     'domiz',   'ماطورات السرعة',       'ماطورات ودراجات نارية وقطع غيار وصيانة.', '07701000024','دوميز، الشارع العام',      0.0002, 0.0002, false, false, '09:00-20:00'),
 ('water-nahr',      'water',      'rayan',   'محطة ماء النهر',       'ماء مفلتر ومعقم، توصيل بالحوضيات والقناني.', '07701000025','الرياض، قرب المدرسة',      0.0003,-0.0004, false, false, '07:00-19:00'),
 ('water-safa',      'water',      'iskan',   'محطة ماء الصفا',       'ماء RO نقي وتوصيل للمنازل.', '07701000026','الإسكان، المجمع السكني',   -0.0002,0.0005, false, false, '07:00-20:00'),
 ('fuel-asri',       'fuel',       'asri',    'محطة وقود العصري',     'بنزين محسّن وعادي وكاز وغاز سائل.', '07701000027','العصري، الطريق العام',     0.0006, 0.0004, true,  false, '00:00-00:00'),
 ('fuel-tisin',      'fuel',       'tisin',   'محطة وقود تسعين',      'بنزين وديزل ومحطة غسيل ملحقة.', '07701000028','تسعين، طريق بغداد',       0.0003, 0.0008, false, false, '00:00-00:00'),
 ('school-future',   'schools',    'azadi',   'مدرسة المستقبل الأهلية','ابتدائية ومتوسطة بمناهج متطورة وكادر متميز.', '07701000029','آزادي، شارع المدارس',     0.0004, 0.0009, true,  false, '07:30-14:00'),
 ('institute-lang',  'institutes', 'asri',    'معهد اللغات الحديثة',  'دورات إنكليزي وتركي وكردي وآيلتس.', '07701000030','العصري، عمارة النخيل',     -0.0005,0.0002, false, false, '09:00-20:00'),
 ('electrician-ali', 'electricians','wasiti', 'الأسطة علي - كهربائي', 'تأسيسات ومولدات وإصلاح أعطال الكهرباء المنزلية.', '07701000031','الواسطي',                   0.0001, 0.0001, false, false, '08:00-22:00'),
 ('plumber-hawre',   'plumbers',   'rahimawa','السباك هاورى',         'سباكة وتمديدات ومعالجة تسرب المياه.', '07701000032','رحيم آوا',                  -0.0001,0.0002, false, false, '08:00-21:00'),
 ('ac-cool',         'ac-repair',  'musalla', 'كول تك للتبريد والتكييف','تركيب وصيانة سبلت ومبردات وغسل المكيفات.', '07701000033','المصلى',                     0.0002,-0.0001, true,  false, '08:00-20:00'),
 ('civil-status',    'civil-status','qala',   'دائرة الأحوال المدنية','الهوية الوطنية، شهادة الجنسية، ووثائق الأحوال الشخصية.', '07701000034','قرب القلعة',                -0.0003,-0.0003, true,  false, '08:00-14:00');

insert into public.businesses (slug, name, description, phone, whatsapp, address, category_id, district_id,
                               lat, lng, status, is_verified, is_featured, featured_until)
select b.slug, b.name, b.descr, b.phone, b.phone, b.addr, c.id, d.id,
       d.lat + b.dlat, d.lng + b.dlng, 'active', b.verified, b.featured,
       case when b.featured then now() + interval '30 days' end
from _biz b
join public.categories c on c.slug = b.cat
join public.districts  d on d.slug = b.dist;

-- Opening hours (every day, from the compact "HH:MM-HH:MM" string; Friday closed for gov. office)
insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_closed)
select bu.id, g.d,
       split_part(b.hours, '-', 1)::time, split_part(b.hours, '-', 2)::time,
       (b.slug = 'civil-status' and g.d in (5, 6))
from _biz b
join public.businesses bu on bu.slug = b.slug
cross join generate_series(0, 6) as g(d);

-- Products & services --------------------------------------------------
insert into public.products_services (business_id, name, description, price, sort_order)
select bu.id, v.name, v.descr, v.price, v.ord
from (values
 ('mutaam-al-qala','كباب لحم (كيلو)','كباب مشوي على الفحم مع الخبز والسلطة',22000,1),
 ('mutaam-al-qala','تكة دجاج','وجبة مع الأرز والمقبلات',9000,2),
 ('mutaam-al-qala','طبق مقبلات مشكل','حمص، متبل، سلطة، لبن',6000,3),
 ('cafe-asri','قهوة تركية','',2500,1),
 ('cafe-asri','لاتيه','',4000,2),
 ('cafe-asri','كيك الجزر','قطعة',3500,3),
 ('lab-shifa','تحليل دم شامل CBC','',8000,1),
 ('lab-shifa','فحص السكر التراكمي','',15000,2),
 ('lab-shifa','سحب منزلي','داخل مدينة كركوك',5000,3),
 ('workshop-askari','فحص كمبيوتر','',15000,1),
 ('workshop-askari','تبديل زيت وفلتر','أجور اليد فقط',10000,2),
 ('carwash-pearl','غسيل خارجي','',5000,1),
 ('carwash-pearl','غسيل كامل مع تلميع','',20000,2),
 ('water-nahr','قنينة 19 لتر','توصيل مجاني فوق 5 قناني',1500,1),
 ('institute-lang','دورة آيلتس (شهرين)','',250000,1),
 ('ac-cool','غسل سبلت','',15000,1),
 ('ac-cool','تعبئة غاز','',35000,2)
) as v(slug, name, descr, price, ord)
join public.businesses bu on bu.slug = v.slug;

-- Pharmacies on duty today and tomorrow ---------------------------------
insert into public.pharmacy_duty (business_id, duty_date, note)
select id, current_date, 'مناوبة ليلية حتى الصباح' from public.businesses where slug in ('pharm-shifa24','pharm-amal');
insert into public.pharmacy_duty (business_id, duty_date, note)
select id, current_date + 1, 'مناوبة ليلية حتى الصباح' from public.businesses where slug in ('pharm-noor','pharm-qoriya');


-- =====================================================================
-- Demo users (so reviews / classifieds have authors). DELETE before launch:
--   delete from auth.users where id::text like '00000000-0000-0000-0000-0000000000d%';
-- =====================================================================
insert into auth.users (id, phone, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000d1', '+9647700000101', '{"full_name":"أحمد الكركوكلي"}'),
 ('00000000-0000-0000-0000-0000000000d2', '+9647700000102', '{"full_name":"سارة محمد"}'),
 ('00000000-0000-0000-0000-0000000000d3', '+9647700000103', '{"full_name":"هاورى كريم"}'),
 ('00000000-0000-0000-0000-0000000000d4', '+9647700000104', '{"full_name":"محمد التركماني"}')
on conflict (id) do nothing;

insert into public.reviews (business_id, user_id, rating, body)
select b.id, u.id, v.rating, v.body
from (values
 ('mutaam-al-qala','00000000-0000-0000-0000-0000000000d1',5,'أفضل كباب في كركوك، الخدمة سريعة والأسعار مناسبة.'),
 ('mutaam-al-qala','00000000-0000-0000-0000-0000000000d2',4,'الطعام ممتاز لكن المكان يزدحم في عطلة نهاية الأسبوع.'),
 ('mutaam-al-qala','00000000-0000-0000-0000-0000000000d3',5,'جلسة عائلية رائعة.'),
 ('cafe-asri','00000000-0000-0000-0000-0000000000d1',5,'قهوة ممتازة وأجواء هادئة للدراسة.'),
 ('cafe-asri','00000000-0000-0000-0000-0000000000d4',4,'جيد جداً، الحلويات لذيذة.'),
 ('pharm-amal','00000000-0000-0000-0000-0000000000d2',5,'صيدلاني متعاون وتوصيل سريع.'),
 ('lab-shifa','00000000-0000-0000-0000-0000000000d3',5,'نتائج دقيقة وسريعة.'),
 ('lab-shifa','00000000-0000-0000-0000-0000000000d4',4,'سحب منزلي مريح.'),
 ('workshop-askari','00000000-0000-0000-0000-0000000000d1',4,'فحص الكمبيوتر دقيق وأسعار معقولة.'),
 ('azadi-mall','00000000-0000-0000-0000-0000000000d2',4,'مول نظيف ومواقف واسعة.')
) as v(slug, uid, rating, body)
join public.businesses b on b.slug = v.slug
join auth.users u on u.id = v.uid::uuid;

update public.reviews set owner_reply = 'شكراً لذوقك، نتشرف بزيارتك دائماً 🌹', replied_at = now()
where body like 'أفضل كباب%';

-- Classifieds ----------------------------------------------------------
insert into public.listings (user_id, kind, district_id, title, description, price, currency, details, phone, lat, lng)
select '00000000-0000-0000-0000-0000000000d1', v.kind::listing_kind, d.id, v.title, v.descr, v.price, v.cur, v.details::jsonb, v.phone, d.lat, d.lng
from (values
 ('property','wasiti','شقة للإيجار في الواسطي - 3 غرف','شقة نظيفة في الطابق الثاني، تشطيب جيد، قريبة من الخدمات والمدارس.', 450000,'IQD','{"deal":"rent","type":"apartment","area_m2":130,"rooms":3,"baths":2,"floor":2}','07702000001'),
 ('property','asri','بيت للبيع في الحي العصري 200 م','بيت طابقين، موقع تجاري مميز على شارع رئيسي، سند طابو.', 235000,'USD','{"deal":"sale","type":"house","area_m2":200,"rooms":5,"baths":3}','07702000002'),
 ('property','azadi','قطعة أرض سكنية في آزادي','أرض 300 م مفرزة وجاهزة للبناء، قريبة من الشارع العام.', 90000,'USD','{"deal":"sale","type":"land","area_m2":300}','07702000003'),
 ('property','iskan','محل تجاري للإيجار - الإسكان','محل 40 م على شارع تجاري، مناسب لمعظم الأنشطة.', 700000,'IQD','{"deal":"rent","type":"shop","area_m2":40}','07702000004'),
 ('property','rahimawa','دار للإيجار في رحيم آوا','دار بحديقة، 4 غرف، مناسبة لعائلة كبيرة.', 600000,'IQD','{"deal":"rent","type":"house","area_m2":250,"rooms":4,"baths":2}','07702000005'),
 ('property','tisin','شقة للبيع في تسعين','شقة جديدة 110 م في مجمع سكني مسوّر.', 78000,'USD','{"deal":"sale","type":"apartment","area_m2":110,"rooms":3,"baths":2,"floor":3}','07702000006'),
 ('vehicle','tisin','تويوتا كورولا 2018 نظيفة','سيارة بحالة ممتازة، فحص كامل، ماكينة وكير أصلي.', 13500,'USD','{"deal":"sale","type":"car","make":"Toyota","model":"Corolla","year":2018,"mileage_km":95000,"fuel":"بنزين"}','07703000001'),
 ('vehicle','askari','هيونداي النترا 2016','سيارة اقتصادية، صبغ وكالة، لا حوادث.', 9800,'USD','{"deal":"sale","type":"car","make":"Hyundai","model":"Elantra","year":2016,"mileage_km":140000,"fuel":"بنزين"}','07703000002'),
 ('vehicle','domiz','ماطور هوندا 150 سي سي 2021','ماطور شبه جديد، أوراق كاملة.', 1900,'USD','{"deal":"sale","type":"motorcycle","make":"Honda","year":2021,"mileage_km":12000}','07703000003'),
 ('vehicle','shorja','مطلوب: قطع غيار كيا سبورتاج 2014','أبحث عن قطع غيار أصلية أو مستعملة بحالة جيدة.', null,'IQD','{"deal":"wanted","type":"parts","make":"Kia","model":"Sportage"}','07703000004'),
 ('job','asri','مطلوب محاسب لشركة تجارية','خبرة لا تقل عن سنتين، إتقان إكسل، الدوام صباحي.', null,'IQD','{"type":"offer","employment":"full","salary":"700,000 - 900,000 د.ع"}','07704000001'),
 ('job','wasiti','مطلوب موظفو مبيعات - مول','دوام جزئي أو كامل، راتب + عمولة، لا يشترط خبرة.', null,'IQD','{"type":"offer","employment":"part","salary":"450,000 + عمولة"}','07704000002'),
 ('job','azadi','أبحث عن عمل: مهندس مدني حديث التخرج','خريج 2025، أجيد أوتوكاد وبرامج الحساب الإنشائي.', null,'IQD','{"type":"seeking","employment":"full"}','07704000003'),
 ('job','musalla','مطلوب سائق توصيل بدراجة نارية','دراجة من الشركة، دوام مسائي، راتب شهري ثابت.', null,'IQD','{"type":"offer","employment":"contract","salary":"600,000"}','07704000004')
) as v(kind, dist, title, descr, price, cur, details, phone)
join public.districts d on d.slug = v.dist;
