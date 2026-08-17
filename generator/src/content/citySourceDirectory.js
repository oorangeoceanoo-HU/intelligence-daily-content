"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.citySourceDirectorySummary = exports.cityOfficialSourceUrls = exports.resolveCitySourceLocation = void 0;
const profileOptions_1 = require("../config/profileOptions");
const builtInOfficialSources = {
    中国: {
        直辖市: {
            北京: ["https://www.beijing.gov.cn/"],
            上海: ["https://www.shanghai.gov.cn/"],
            天津: ["https://www.tj.gov.cn/"],
            重庆: ["https://www.cq.gov.cn/"]
        },
        江苏: {
            南京: ["https://www.nanjing.gov.cn/"],
            苏州: ["https://www.suzhou.gov.cn/"]
        },
        浙江: {
            杭州: ["https://www.hangzhou.gov.cn/"]
        },
        湖南: {
            长沙: ["https://www.changsha.gov.cn/"]
        },
        广东: {
            广州: ["https://www.gz.gov.cn/"],
            深圳: ["https://www.sz.gov.cn/"]
        }
    }
};
const stringArray = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string" && Boolean(item.trim())) : [];
const objectValue = (value, key) => value && typeof value === "object" ? value[key] : undefined;
const resolveCitySourceLocation = (country, city) => {
    const section = (0, profileOptions_1.getCitySections)(country).find((item) => item.options.includes(city));
    return {
        country,
        province: section?.title ?? country,
        city
    };
};
exports.resolveCitySourceLocation = resolveCitySourceLocation;
const cityOfficialSourceUrls = (country, city, configuredJson) => {
    const location = (0, exports.resolveCitySourceLocation)(country, city);
    const configured = [];
    if (configuredJson) {
        try {
            const parsed = JSON.parse(configuredJson);
            configured.push(...stringArray(objectValue(objectValue(objectValue(parsed, country), location.province), city)), ...stringArray(objectValue(objectValue(parsed, country), city)), ...stringArray(objectValue(parsed, city)));
        }
        catch {
            // Invalid optional configuration is ignored; health output will still show an empty city result.
        }
    }
    const builtIn = builtInOfficialSources[country]?.[location.province]?.[city] ?? [];
    return Array.from(new Set([...configured, ...builtIn]));
};
exports.cityOfficialSourceUrls = cityOfficialSourceUrls;
const citySourceDirectorySummary = (country) => (0, profileOptions_1.getCitySections)(country).map((section) => ({
    country,
    province: section.title,
    cities: section.options.map((city) => ({
        city,
        officialSourceCount: (0, exports.cityOfficialSourceUrls)(country, city).length
    }))
}));
exports.citySourceDirectorySummary = citySourceDirectorySummary;
