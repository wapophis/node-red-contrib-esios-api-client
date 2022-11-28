"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EsiosApiClient = void 0;
const core_1 = require("@js-joda/core");
const extra_1 = require("@js-joda/extra");
const src_1 = require("@virtualbat/entities/dist/src");
const axios_1 = __importDefault(require("axios"));
require("@js-joda/timezone");
class EsiosApiClient {
    constructor() {
        this.pricesTables = null;
        this.pricesTables = new src_1.PricesTables();
    }
    requestPrices(endPoint, apiToken) {
        console.log(arguments);
        return axios_1.default
            .get(endPoint, { params: {
                date: core_1.LocalDateTime.now().format(core_1.DateTimeFormatter.ofPattern('yyyy-MM-dd'))
            }, headers: {
                "Authorization": 'Token token="' + apiToken + '"'
            }
        })
            .then(res => {
            console.log("QUERY PVPC RESOLVED");
            res.data.PVPC.forEach((element) => {
                var _a, _b;
                (_a = this.pricesTables) === null || _a === void 0 ? void 0 : _a.addPriceToBuy(EsiosApiClient._getPvpC(element));
                //             this.pricesTables?.addPricetoSell(EsiosApiClient._getPmh(element));
                (_b = this.pricesTables) === null || _b === void 0 ? void 0 : _b.addEnergyTerm(EsiosApiClient._getTEU(element));
            });
        });
    }
    /**
     * Request esios indicator.
     * @param endPoint
     * @param indicator
     * @param apiToken
     * @param onSucess
     * @param onError
     * @returns
     */
    requestPriceToSellIndicator(endPoint, indicator, apiToken) {
        let start_time = core_1.LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).format(core_1.DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        let end_time = core_1.LocalDateTime.now().withHour(23).withMinute(0).withSecond(0).format(core_1.DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        console.log(arguments, { range: { start_time: start_time, end_time: end_time } });
        return axios_1.default
            .get(endPoint, { params: {
                start_date: start_time,
                end_date: end_time
            }, headers: {
                'Authorization': 'Token token=' + apiToken
            }
        })
            .then(res => {
            console.log("RESPONSE:" + JSON.stringify(res.data));
            res.data.indicator.values.forEach((element) => {
                var _a;
                let item = new src_1.PriceIntervalItem();
                item.setInterval(EsiosApiClient._getValueInterval(element));
                item.setPrice(element.value);
                (_a = this.pricesTables) === null || _a === void 0 ? void 0 : _a.addPricetoSell(item);
            });
        });
    }
    static _getPvpC(serItem) {
        let item = new src_1.PriceIntervalItem();
        item.setInterval(EsiosApiClient._getInterval(serItem));
        item.setPrice(parseFloat(serItem.PCB.toString().replace(/,/g, '.')));
        return item;
    }
    static _getPmh(serItem) {
        let item = new src_1.PriceIntervalItem();
        item.setInterval(EsiosApiClient._getInterval(serItem));
        if (serItem.PMHPCB !== undefined) {
            item.setPrice(parseFloat(serItem.PMHPCB.toString().replace(/,/g, '.')));
        }
        return item;
    }
    static _getTEU(serItem) {
        let item = new src_1.PriceIntervalItem();
        item.setInterval(EsiosApiClient._getInterval(serItem));
        item.setPrice(parseFloat(serItem.TEUPCB.toString().replace(/,/g, '.')));
        return item;
    }
    static _getInterval(serItem) {
        let startHour = Number.parseInt(serItem.Hora.split("-")[0]);
        let startDateTime = core_1.LocalDate.parse(serItem.Dia, core_1.DateTimeFormatter.ofPattern("dd/MM/yyyy")).atTime(startHour, 0, 0, 0);
        let endDateTime = startDateTime.plusHours(1);
        let startInstant = startDateTime.atZone(core_1.ZoneId.of("Europe/Madrid")).toInstant();
        let endInstant = endDateTime.atZone(core_1.ZoneId.of("Europe/Madrid")).toInstant();
        return extra_1.Interval.of(startInstant, endInstant);
    }
    static _getValueInterval(serItem) {
        let startDateTime = core_1.LocalDateTime.parse(serItem.datetime, core_1.DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        let endDateTime = startDateTime.plusHours(1);
        let startInstant = startDateTime.atZone(core_1.ZoneId.of("Europe/Madrid")).toInstant();
        let endInstant = endDateTime.atZone(core_1.ZoneId.of("Europe/Madrid")).toInstant();
        return extra_1.Interval.of(startInstant, endInstant);
    }
}
exports.EsiosApiClient = EsiosApiClient;
