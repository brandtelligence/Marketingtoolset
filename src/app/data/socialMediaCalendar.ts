export type Platform = 'Instagram' | 'Facebook' | 'LinkedIn' | 'Twitter' | 'TikTok';
export type PostType = 'Carousel' | 'Single Image' | 'Video' | 'Story' | 'Reel';

export interface SocialPost {
  id: string;
  date: string;
  platform: Platform;
  postType: PostType;
  caption: string;
  hashtags: string[];
  visualDescription: string;
  callToAction: string;
  time: string;
}

export const socialMediaCalendar: SocialPost[] = [
  // Week 1
  {
    id: '1',
    date: '2026-03-01',
    platform: 'Instagram',
    postType: 'Carousel',
    caption: '🚀 Say goodbye to paper business cards! Create your digital business card in under 5 minutes with vCard SaaS.\n\nSwipe to see how easy it is:\n1️⃣ Choose your template\n2️⃣ Add your details\n3️⃣ Share instantly via QR code\n\nJoin 10,000+ professionals who\'ve made the switch!',
    hashtags: ['#DigitalBusinessCard', '#Networking', '#VCardSaaS', '#ProfessionalNetworking', '#QRCode', '#BusinessGrowth'],
    visualDescription: 'Carousel showing 3 steps: template selection, profile editing, QR code sharing',
    callToAction: 'Start your free trial - Link in bio!',
    time: '09:00 AM'
  },
  {
    id: '2',
    date: '2026-03-02',
    platform: 'LinkedIn',
    postType: 'Single Image',
    caption: 'The average professional meets 50+ new contacts per month.\n\nHow many of those paper business cards end up in the trash? 🗑️\n\nvCard SaaS helps you make every connection count with:\n✅ Instant contact sharing\n✅ Real-time analytics\n✅ Eco-friendly networking\n✅ Always up-to-date information\n\nTransform your networking game today.',
    hashtags: ['#BusinessNetworking', '#DigitalTransformation', '#SustainableBusiness', '#ProfessionalGrowth'],
    visualDescription: 'Professional infographic showing traditional vs digital business cards comparison',
    callToAction: 'Learn more at vcard.brandtelligence.my',
    time: '10:00 AM'
  },
  {
    id: '3',
    date: '2026-03-03',
    platform: 'Facebook',
    postType: 'Video',
    caption: '✨ Watch how vCard SaaS makes networking effortless!\n\nSimply tap your phone on an NFC-enabled device and instantly share:\n📱 Contact details\n🌐 Website & social media\n📧 Email & phone\n💼 Portfolio & services\n\nNo app downloads required for your contacts!\n\n99% customer satisfaction rate 🌟',
    hashtags: ['#NFCTechnology', '#SmartNetworking', '#BusinessCards', '#DigitalCards'],
    visualDescription: 'Video demonstration of NFC tap-to-share feature',
    callToAction: 'Try it free today!',
    time: '02:00 PM'
  },
  {
    id: '4',
    date: '2026-03-04',
    platform: 'Instagram',
    postType: 'Story',
    caption: '🎨 NEW TEMPLATES ALERT!\n\nJust dropped: 3 new professionally designed templates for:\n• Real Estate Agents 🏡\n• Fitness Coaches 💪\n• Tech Startups 🚀\n\nWhich industry should we design next? Vote below! 👇',
    hashtags: ['#NewRelease', '#Templates', '#VCardDesign'],
    visualDescription: 'Animated story showing new template previews with poll sticker',
    callToAction: 'Swipe up to explore templates',
    time: '06:00 PM'
  },
  {
    id: '5',
    date: '2026-03-05',
    platform: 'TikTok',
    postType: 'Video',
    caption: 'POV: You\'re still carrying paper business cards in 2026 😬\n\n#BusinessTok #NetworkingTips #DigitalTransformation #SmallBusinessTips #Entrepreneur',
    hashtags: ['#BusinessTok', '#NetworkingTips', '#DigitalTransformation', '#SmallBusinessTips', '#Entrepreneur'],
    visualDescription: 'Trending TikTok format showing outdated vs modern networking',
    callToAction: 'Link in bio to upgrade your networking',
    time: '07:00 PM'
  },
  {
    id: '6',
    date: '2026-03-06',
    platform: 'LinkedIn',
    postType: 'Carousel',
    caption: '📊 Case Study: How Sarah, a freelance designer, 10x\'ed her networking ROI with vCard SaaS\n\nBefore vCard:\n• Spent RM500 on printed cards annually\n• Lost 70% of contacts\n• No follow-up tracking\n\nAfter vCard:\n• RM0 printing costs\n• 98% contact retention\n• Real-time engagement analytics\n• 3x more project inquiries\n\nSwipe to see her full journey ➡️',
    hashtags: ['#CaseStudy', '#FreelancerSuccess', '#NetworkingStrategy', '#BusinessGrowth'],
    visualDescription: 'Professional case study carousel with stats and testimonial',
    callToAction: 'Start your success story today',
    time: '11:00 AM'
  },
  {
    id: '7',
    date: '2026-03-07',
    platform: 'Instagram',
    postType: 'Reel',
    caption: '5 networking mistakes you\'re making (and how to fix them) 🎯\n\n1. Using outdated contact info ❌\n2. No follow-up system ❌\n3. Missing analytics ❌\n4. Not eco-friendly ❌\n5. Limited sharing options ❌\n\nvCard SaaS fixes ALL of these! ✅\n\nDouble tap if you\'re ready to level up your networking game! 💪',
    hashtags: ['#NetworkingTips', '#BusinessGrowth', '#DigitalCards', '#ProfessionalDevelopment', '#ReelsInstagram'],
    visualDescription: 'Fast-paced reel with dynamic text overlays and transitions',
    callToAction: 'Start free trial now!',
    time: '05:00 PM'
  },

  // Week 2
  {
    id: '8',
    date: '2026-03-08',
    platform: 'Twitter',
    postType: 'Single Image',
    caption: '🌍 vCard SaaS users span 50+ countries!\n\nFrom Kuala Lumpur to New York, professionals worldwide are ditching paper cards.\n\nWhere are you networking from? Drop your city below! 👇',
    hashtags: ['#GlobalNetworking', '#DigitalBusiness', '#VCard'],
    visualDescription: 'World map highlighting 50+ countries with vCard users',
    callToAction: 'Join the global movement',
    time: '09:30 AM'
  },
  {
    id: '9',
    date: '2026-03-09',
    platform: 'Facebook',
    postType: 'Single Image',
    caption: '💡 Monday Motivation: "Your network is your net worth."\n\nMake every connection count with vCard SaaS. Our analytics dashboard shows you:\n📈 Who viewed your card\n🔍 Which links they clicked\n⏰ When they engaged\n📊 Total reach & impressions\n\nData-driven networking = Better results',
    hashtags: ['#MondayMotivation', '#NetworkingTips', '#BusinessAnalytics', '#ProfessionalGrowth'],
    visualDescription: 'Motivational quote with analytics dashboard preview',
    callToAction: 'Get insights with free trial',
    time: '08:00 AM'
  },
  {
    id: '10',
    date: '2026-03-10',
    platform: 'Instagram',
    postType: 'Carousel',
    caption: '🎨 Template Tuesday! This week: The "Medical Professional" template\n\nPerfect for:\n• Doctors 👨‍⚕️\n• Dentists 🦷\n• Therapists 🧠\n• Healthcare consultants 💊\n\nFeatures:\n✅ Appointment booking integration\n✅ Clinic location map\n✅ Services showcase\n✅ Patient testimonials section\n\nSwipe to see it in action! ➡️',
    hashtags: ['#TemplateTuesday', '#HealthcareProfessionals', '#DigitalCards', '#MedicalMarketing'],
    visualDescription: 'Carousel showcasing medical template with different sections',
    callToAction: 'Try this template free',
    time: '12:00 PM'
  },
  {
    id: '11',
    date: '2026-03-11',
    platform: 'LinkedIn',
    postType: 'Single Image',
    caption: '🌱 Sustainability meets professionalism.\n\n10,000 users x 500 cards each = 5 MILLION paper cards saved!\n\nThat\'s:\n🌳 50 trees saved\n💧 500,000 gallons of water conserved\n♻️ 2 tons of waste prevented\n\nvCard SaaS isn\'t just smart business—it\'s responsible business.\n\nWhat\'s your company doing for sustainability?',
    hashtags: ['#Sustainability', '#EcoFriendly', '#CorporateResponsibility', '#GreenBusiness', '#ESG'],
    visualDescription: 'Infographic showing environmental impact statistics',
    callToAction: 'Make the sustainable choice',
    time: '10:30 AM'
  },
  {
    id: '12',
    date: '2026-03-12',
    platform: 'TikTok',
    postType: 'Video',
    caption: 'When someone asks for your business card and you pull out your phone instead 😎📱\n\n*Taps phone* "You\'ve got my card!" \n\nTheir reaction: 🤯\n\n#TechTok #BusinessHacks #Innovation',
    hashtags: ['#TechTok', '#BusinessHacks', '#Innovation', '#NFCTechnology', '#FutureTech'],
    visualDescription: 'Trending reaction video format showing NFC sharing',
    callToAction: 'Get your digital card',
    time: '08:00 PM'
  },
  {
    id: '13',
    date: '2026-03-13',
    platform: 'Instagram',
    postType: 'Story',
    caption: '🎉 WEEKEND SPECIAL 🎉\n\nUpgrade to our Starter plan and get:\n✨ 30% OFF first month\n✨ 5 custom domains\n✨ Unlimited analytics\n\n48 hours only! ⏰\n\nSwipe up to claim your discount!',
    hashtags: ['#WeekendDeal', '#LimitedOffer'],
    visualDescription: 'Eye-catching promotional story with countdown timer',
    callToAction: 'Swipe up - Offer ends Sunday!',
    time: '10:00 AM'
  },
  {
    id: '14',
    date: '2026-03-14',
    platform: 'Facebook',
    postType: 'Video',
    caption: '📱 What is NFC and why should you care?\n\nNear Field Communication lets you share your digital business card with a simple tap—no apps, no typing, no hassle.\n\nWorks with:\n✅ Most smartphones (iPhone & Android)\n✅ NFC business cards\n✅ Smart accessories\n\nWatch this quick explainer to see how it works! 👆\n\n#TechEducation #NFCExplained',
    hashtags: ['#TechEducation', '#NFCExplained', '#BusinessTechnology', '#Innovation'],
    visualDescription: 'Educational video explaining NFC technology simply',
    callToAction: 'Get your NFC-enabled vCard',
    time: '03:00 PM'
  },

  // Week 3
  {
    id: '15',
    date: '2026-03-15',
    platform: 'LinkedIn',
    postType: 'Single Image',
    caption: '🎯 Networking Pro Tip:\n\nThe fortune is in the follow-up!\n\nvCard SaaS helps you track:\n✔️ Who viewed your card\n✔️ When they viewed it\n✔️ What info they were most interested in\n\nUse these insights to craft personalized follow-ups that actually convert.\n\nSmart networking = More opportunities',
    hashtags: ['#NetworkingTips', '#SalesStrategy', '#BusinessDevelopment', '#ProfessionalGrowth'],
    visualDescription: 'Professional tip card with follow-up statistics',
    callToAction: 'Master your follow-up game',
    time: '09:00 AM'
  },
  {
    id: '16',
    date: '2026-03-16',
    platform: 'Instagram',
    postType: 'Reel',
    caption: 'Types of people at networking events 😂\n\n1. The paper card hoarder 📇\n2. The "I\'ll find you on LinkedIn" person 🔍\n3. The vCard SaaS user *taps phone* 😎✨\n\nWhich one are you? Comment below! 👇\n\n#NetworkingHumor #BusinessMemes #RelatabContent',
    hashtags: ['#NetworkingHumor', '#BusinessMemes', '#RelatableContent', '#BusinessTok', '#Entrepreneurship'],
    visualDescription: 'Humorous reel showing different networking stereotypes',
    callToAction: 'Be #3 - Start free trial!',
    time: '06:00 PM'
  },
  {
    id: '17',
    date: '2026-03-17',
    platform: 'Twitter',
    postType: 'Single Image',
    caption: '🚀 NEW FEATURE: Google Wallet Integration!\n\nNow your contacts can save your vCard directly to their Google Wallet.\n\nOne tap. Zero friction. Maximum impact.\n\nAvailable on all plans starting today! 🎉',
    hashtags: ['#ProductUpdate', '#GoogleWallet', '#TechNews'],
    visualDescription: 'Feature announcement graphic showing Google Wallet integration',
    callToAction: 'Update your card now',
    time: '11:00 AM'
  },
  {
    id: '18',
    date: '2026-03-18',
    platform: 'Facebook',
    postType: 'Carousel',
    caption: '💼 Industries thriving with vCard SaaS:\n\n1. Real Estate Agents - instant property sharing 🏡\n2. Freelancers - portfolio showcases 🎨\n3. Healthcare - appointment booking 🏥\n4. Consultants - service packages 💼\n5. Hospitality - menu & reservations 🍽️\n\nWhat industry are you in? We probably have a template for you!\n\nSwipe to see examples ➡️',
    hashtags: ['#IndustrySpotlight', '#BusinessSolutions', '#DigitalTransformation'],
    visualDescription: 'Carousel showing different industry templates with use cases',
    callToAction: 'Find your perfect template',
    time: '01:00 PM'
  },
  {
    id: '19',
    date: '2026-03-19',
    platform: 'Instagram',
    postType: 'Story',
    caption: '⭐ USER SPOTLIGHT ⭐\n\n"vCard SaaS helped me close 40% more deals by making follow-ups effortless!" - Ahmad, Real Estate Agent\n\nShare your success story for a chance to be featured! 📸',
    hashtags: ['#UserSpotlight', '#SuccessStory', '#Testimonial'],
    visualDescription: 'User testimonial with professional headshot and quote',
    callToAction: 'DM us your story!',
    time: '04:00 PM'
  },
  {
    id: '20',
    date: '2026-03-20',
    platform: 'LinkedIn',
    postType: 'Video',
    caption: '🎥 Behind the Scenes: Meet the vCard SaaS Team\n\nWe\'re a passionate group of tech enthusiasts and networking experts based in Kuala Lumpur, Malaysia 🇲🇾\n\nSince 2020, we\'ve been on a mission to revolutionize professional networking for 10,000+ users across 50+ countries.\n\nThank you for being part of our journey! 🙏\n\n#CompanyCulture #TeamSpotlight #MalaysianTech',
    hashtags: ['#CompanyCulture', '#TeamSpotlight', '#MalaysianTech', '#StartupLife'],
    visualDescription: 'Team introduction video showing office and team members',
    callToAction: 'Join our community',
    time: '10:00 AM'
  },
  {
    id: '21',
    date: '2026-03-21',
    platform: 'TikTok',
    postType: 'Video',
    caption: 'How to network like a PRO in 2026 🎯\n\nStep 1: Create digital card ✅\nStep 2: Enable NFC ✅\nStep 3: *Tap* ✅\nStep 4: Watch connections grow 📈\n\nIt\'s really that simple.\n\n#ProductivityHacks #BusinessTips',
    hashtags: ['#ProductivityHacks', '#BusinessTips', '#EntrepreneurLife', '#StartupTips', '#BusinessGrowth'],
    visualDescription: 'Quick tutorial video with text overlays',
    callToAction: 'Start networking smarter',
    time: '07:30 PM'
  },

  // Week 4
  {
    id: '22',
    date: '2026-03-22',
    platform: 'Instagram',
    postType: 'Carousel',
    caption: '📊 Your March Networking Checklist:\n\n☑️ Update your vCard with latest info\n☑️ Review your analytics dashboard\n☑️ Follow up with recent connections\n☑️ Refresh your profile photo\n☑️ Add new portfolio pieces\n☑️ Enable Google Wallet integration\n\nHow many have you checked off? Let us know! 👇',
    hashtags: ['#NetworkingChecklist', '#MarchGoals', '#ProfessionalDevelopment', '#BusinessTips'],
    visualDescription: 'Checklist carousel with actionable tips',
    callToAction: 'Complete your profile today',
    time: '09:00 AM'
  },
  {
    id: '23',
    date: '2026-03-23',
    platform: 'Facebook',
    postType: 'Single Image',
    caption: '🌟 Testimonial Tuesday!\n\n"As a wedding photographer, I meet dozens of couples every month. vCard SaaS has streamlined my entire booking process. Clients love browsing my portfolio right from my digital card!" - Lisa M., Photography\n\n⭐⭐⭐⭐⭐ 99% Satisfaction Rate\n\nJoin thousands of satisfied professionals!',
    hashtags: ['#TestimonialTuesday', '#CustomerReview', '#5Stars', '#Photography'],
    visualDescription: 'Testimonial graphic with 5-star rating and user photo',
    callToAction: 'Read more success stories',
    time: '12:00 PM'
  },
  {
    id: '24',
    date: '2026-03-24',
    platform: 'LinkedIn',
    postType: 'Single Image',
    caption: '💰 The Real Cost of Paper Business Cards:\n\nInitial printing: RM300-500\nReprints (info changes): RM300 x 3/year\nRush orders: RM150 extra\nDesign fees: RM200+\nStorage/organization: Time = Money\nLost opportunities: Priceless\n\nTotal annual cost: ~RM2,000+\n\nvCard SaaS: RM19.99/month = RM239.88/year\n\nSavings: RM1,760+ per year 💸\n\nThe math speaks for itself.',
    hashtags: ['#BusinessSavings', '#ROI', '#SmartBusiness', '#CostEffective', '#DigitalTransformation'],
    visualDescription: 'Cost comparison infographic with calculations',
    callToAction: 'Calculate your savings',
    time: '10:30 AM'
  },
  {
    id: '25',
    date: '2026-03-25',
    platform: 'Instagram',
    postType: 'Reel',
    caption: '✨ Design your dream business card in 60 seconds! Watch how:\n\n1️⃣ Pick a template\n2️⃣ Add your info\n3️⃣ Customize colors & layout\n4️⃣ Generate QR code\n5️⃣ Share instantly!\n\nNo design skills needed. Everything is drag-and-drop simple.\n\nReady to try? 👇',
    hashtags: ['#Tutorial', '#HowTo', '#DigitalDesign', '#DIYBusiness', '#SmallBusinessTips'],
    visualDescription: 'Screen recording tutorial with voice-over',
    callToAction: 'Try it free - link in bio',
    time: '05:00 PM'
  },
  {
    id: '26',
    date: '2026-03-26',
    platform: 'Twitter',
    postType: 'Single Image',
    caption: '🔥 Hot Take:\n\nPaper business cards in 2026 = Fax machines in 2020\n\nOutdated. Inefficient. Forgotten.\n\nYour network deserves better. You deserve better.\n\nMake the switch today. 📱➡️✨',
    hashtags: ['#HotTake', '#DigitalFirst', '#Innovation'],
    visualDescription: 'Bold statement graphic with modern design',
    callToAction: 'Upgrade your networking',
    time: '02:00 PM'
  },
  {
    id: '27',
    date: '2026-03-27',
    platform: 'Facebook',
    postType: 'Carousel',
    caption: '🎓 Networking 101: The Ultimate Guide\n\nLesson 1: First impressions matter\nLesson 2: Follow up within 24 hours\nLesson 3: Track your connections\nLesson 4: Stay updated & relevant\nLesson 5: Make it easy to connect\n\nvCard SaaS helps you ace all 5! Swipe for details ➡️\n\nSave this for later! 📌',
    hashtags: ['#NetworkingGuide', '#BusinessEducation', '#ProfessionalTips', '#CareerGrowth'],
    visualDescription: 'Educational carousel with tips and illustrations',
    callToAction: 'Start networking like a pro',
    time: '11:00 AM'
  },
  {
    id: '28',
    date: '2026-03-28',
    platform: 'Instagram',
    postType: 'Story',
    caption: '🎉 WEEKEND POLL 🎉\n\nWhat feature would you like to see next?\n\nA) AI-powered card designer 🤖\nB) Video introduction clips 🎥\nC) Voice message integration 🎙️\nD) Calendar booking sync 📅\n\nVote below! Your feedback shapes our roadmap! 💡',
    hashtags: ['#UserFeedback', '#ProductDevelopment'],
    visualDescription: 'Interactive poll story with emoji options',
    callToAction: 'Vote now!',
    time: '09:00 AM'
  },
  {
    id: '29',
    date: '2026-03-29',
    platform: 'LinkedIn',
    postType: 'Single Image',
    caption: '🎯 This Week\'s Focus: Quality over Quantity\n\nIt\'s not about how many business cards you collect—it\'s about meaningful connections you nurture.\n\nvCard SaaS analytics show you which connections are most engaged, so you can focus your energy where it matters most.\n\nWork smarter, not harder. 💡',
    hashtags: ['#NetworkingStrategy', '#QualityOverQuantity', '#SmartBusiness', '#ProfessionalGrowth'],
    visualDescription: 'Inspirational quote graphic with analytics preview',
    callToAction: 'Track your meaningful connections',
    time: '08:30 AM'
  },
  {
    id: '30',
    date: '2026-03-30',
    platform: 'TikTok',
    postType: 'Video',
    caption: 'They said paper business cards are dead... and they were RIGHT 💀\n\n*Shows crumpled cards in wallet*\n*Shows vCard SaaS interface*\n\nThe future is digital. The future is now.\n\n#TechUpgrade #ModernBusiness',
    hashtags: ['#TechUpgrade', '#ModernBusiness', '#BusinessTransformation', '#FutureTech', '#Innovation'],
    visualDescription: 'Before/after comparison video with trending audio',
    callToAction: 'Join the digital revolution',
    time: '08:00 PM'
  },
  {
    id: '31',
    date: '2026-03-31',
    platform: 'Instagram',
    postType: 'Carousel',
    caption: '📅 March Wrapped: Your Month in Numbers\n\nThis month, our community:\n✨ Created 2,500+ new digital cards\n🌍 Connected across 52 countries\n📊 Tracked 1M+ card views\n🌱 Saved 250,000 paper cards\n💚 Planted 25 trees (via our eco program)\n\nThank you for growing with us! What\'s your March networking win? Share below! 👇\n\nApril goals incoming... 🚀',
    hashtags: ['#MonthlyRecap', '#CommunityGrowth', '#VCardSaaS', '#Networking2026', '#ThankYou'],
    visualDescription: 'Month-end summary carousel with statistics and achievements',
    callToAction: 'Here\'s to an even better April!',
    time: '04:00 PM'
  }
];
