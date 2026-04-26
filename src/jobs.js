export const categories = ["Campus", "Food Service", "Retail", "Events", "Remote", "Care"];
export const schedules = ["Morning", "Afternoon", "Evening", "Weekend", "Flexible"];

export const seedJobs = [
  {
    id: "campus-library",
    title: "Campus Library Assistant",
    employer: "North City Library",
    category: "Campus",
    pay: 22,
    payType: "hour",
    location: "New York",
    remote: false,
    schedule: "Evening",
    description: "Support circulation desk checkouts, shelve returns, and help students find study materials.",
    requirements: ["Student friendly", "Basic computer skills", "Can work two evenings weekly"],
    verifiedEmployer: true,
    postedAt: "2026-04-22",
    tags: ["campus", "quiet", "weekly"],
    localized: {
      zh: {
        title: "校园图书馆助理",
        description: "协助借还书、整理归还资料，并帮助学生查找学习材料。",
        requirements: ["适合学生", "具备基础电脑技能", "每周可工作两个晚上"]
      }
    }
  },
  {
    id: "cafe-shift",
    title: "Cafe Weekend Shift Helper",
    employer: "Maple Cup Cafe",
    category: "Food Service",
    pay: 24,
    payType: "hour",
    location: "Boston",
    remote: false,
    schedule: "Weekend",
    description: "Help with counter service, table resets, and pickup orders during busy weekend brunch hours.",
    requirements: ["Friendly service", "Can stand for 4-hour shifts", "Food handler card preferred"],
    verifiedEmployer: true,
    postedAt: "2026-04-24",
    tags: ["weekend", "tips", "local"],
    localized: {
      zh: {
        title: "咖啡店周末班帮手",
        description: "在周末早午餐高峰期协助柜台服务、整理桌面和处理外带订单。",
        requirements: ["服务态度友好", "可站立工作 4 小时", "有食品处理证优先"]
      }
    }
  },
  {
    id: "remote-support",
    title: "Remote Chinese Support Associate",
    employer: "Bright Desk",
    category: "Remote",
    pay: 28,
    payType: "hour",
    location: "Remote",
    remote: true,
    schedule: "Flexible",
    description: "Answer customer questions in Chinese and English for a growing ecommerce support desk.",
    requirements: ["Chinese and English fluency", "Stable internet", "Customer support experience helpful"],
    verifiedEmployer: true,
    postedAt: "2026-04-25",
    tags: ["remote", "bilingual", "support"],
    localized: {
      zh: {
        title: "远程中文客服专员",
        description: "为增长中的电商客服团队用中文和英文回答客户问题。",
        requirements: ["中英文流利", "网络稳定", "有客服经验更佳"]
      }
    }
  },
  {
    id: "task-video-captions",
    workMode: "task",
    taskSource: "employer",
    title: "Short Video Caption Cleanup",
    employer: "Media Shop",
    category: "Remote",
    taskType: "content",
    pay: 30,
    payType: "task",
    estimatedTime: "60-90 minutes",
    settlement: "afterDone",
    difficulty: "easy",
    remoteFriendly: true,
    location: "Remote",
    remote: true,
    schedule: "Flexible",
    description: "Clean up captions for a short product video and return corrected subtitle text.",
    requirements: ["Careful proofreading", "Comfortable with short video captions", "Can finish within one day"],
    verifiedEmployer: true,
    postedAt: "2026-04-25",
    tags: ["remote", "task", "content"],
    localized: {
      zh: {
        title: "短视频字幕整理任务",
        description: "为一段产品短视频整理字幕，修正错字并提交校对后的字幕文本。",
        requirements: ["细心校对", "熟悉短视频字幕", "可在一天内完成"]
      }
    }
  },
  {
    id: "task-campus-photo-check",
    workMode: "task",
    taskSource: "campus",
    title: "Campus Poster Photo Check",
    employer: "Campus Club",
    category: "Campus",
    taskType: "campus",
    campusName: "North City University",
    targetAudience: "Students near the main library",
    pay: 35,
    payType: "task",
    estimatedTime: "45 minutes",
    settlement: "nextDay",
    difficulty: "easy",
    remoteFriendly: false,
    location: "Campus",
    remote: false,
    schedule: "Flexible",
    description: "Check poster photos near the main library and mark whether each store name is visible.",
    requirements: ["North City University student", "Can visit the main library area", "Phone camera access"],
    verifiedEmployer: true,
    postedAt: "2026-04-25",
    tags: ["campus", "task", "campus-task"],
    localized: {
      zh: {
        title: "校园海报照片检查任务",
        description: "在主图书馆附近检查海报照片，并标记每张照片中的店名是否清晰可见。",
        requirements: ["北城大学学生", "可前往主图书馆区域", "可使用手机拍照"]
      }
    }
  },
  {
    id: "event-checkin",
    title: "Conference Check-In Staff",
    employer: "City Events Group",
    category: "Events",
    pay: 26,
    payType: "hour",
    location: "Chicago",
    remote: false,
    schedule: "Morning",
    description: "Scan tickets, hand out badges, and direct guests during a one-day business conference.",
    requirements: ["Punctual", "Comfortable speaking with guests", "Black shirt required"],
    verifiedEmployer: false,
    postedAt: "2026-04-23",
    tags: ["event", "one-day", "morning"],
    localized: {
      zh: {
        title: "会议签到人员",
        description: "在一日商务会议中扫码验票、发放胸牌，并引导来宾。",
        requirements: ["守时可靠", "能自然与来宾沟通", "需穿黑色上衣"]
      }
    }
  }
];
