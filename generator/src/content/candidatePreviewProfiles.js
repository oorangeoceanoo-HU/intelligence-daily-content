"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleCandidateIssuePreviews = exports.candidatePreviewProfiles = void 0;
const candidateGenerator_1 = require("./candidateGenerator");
exports.candidatePreviewProfiles = [
    {
        name: "AI 产品用户",
        profile: {
            phone: "preview-ai",
            inviteCode: "PREVIEW-AI",
            displayName: "AI 产品用户",
            phase: "产品实习 / AI 学习者",
            careerDirections: ["AI 与产品方向", "互联网产品 / 产品经理"],
            country: "中国",
            livingCity: "上海",
            hometownCity: "杭州",
            interests: ["AI 产品", "产品行业", "AI 技术", "本地提醒"]
        }
    },
    {
        name: "教师用户",
        profile: {
            phone: "preview-education",
            inviteCode: "PREVIEW-EDU",
            displayName: "教师用户",
            phase: "初级职场人",
            careerDirections: ["教师 / 教育从业者"],
            country: "中国",
            livingCity: "杭州",
            hometownCity: "南京",
            interests: ["教育行业", "教育", "本地提醒"]
        }
    },
    {
        name: "HR 用户",
        profile: {
            phone: "preview-hr",
            inviteCode: "PREVIEW-HR",
            displayName: "HR 用户",
            phase: "初级职场人",
            careerDirections: ["人力资源 / 招聘"],
            country: "中国",
            livingCity: "上海",
            hometownCity: "苏州",
            interests: ["HR / 招聘", "金融", "本地提醒"]
        }
    },
    {
        name: "运营用户",
        profile: {
            phone: "preview-operations",
            inviteCode: "PREVIEW-OPS",
            displayName: "运营用户",
            phase: "初级职场人",
            careerDirections: ["运营 / 增长", "内容创作 / 自媒体"],
            country: "中国",
            livingCity: "广州",
            hometownCity: "长沙",
            interests: ["运营增长", "消费趋势", "热点素材", "电商"]
        }
    },
    {
        name: "多职业公共版",
        profile: {
            phone: "preview-public",
            inviteCode: "PREVIEW-PUBLIC",
            displayName: "多职业公共版",
            phase: "初级职场人",
            careerDirections: [
                "AI 与产品方向",
                "互联网产品 / 产品经理",
                "运营 / 增长",
                "人力资源 / 招聘",
                "博士 / 学术研究",
                "通信 / 网络研究",
                "建筑 / 城乡建设",
                "教师 / 教育从业者",
                "技术研发 / 工程"
            ],
            country: "中国",
            livingCity: "上海",
            hometownCity: "杭州",
            interests: [
                "AI 产品",
                "产品行业",
                "AI 技术",
                "教育行业",
                "HR / 招聘",
                "运营增长",
                "金融",
                "论文与通信研究",
                "建筑与城市",
                "本地提醒"
            ]
        }
    }
];
exports.sampleCandidateIssuePreviews = exports.candidatePreviewProfiles.map(({ name, profile }) => (0, candidateGenerator_1.buildCandidateIssuePreview)(name, profile));
