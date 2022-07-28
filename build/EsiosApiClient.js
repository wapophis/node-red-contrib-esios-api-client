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
    requestPrices(endPoint, apiToken, onSucess, onError) {
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
                var _a, _b, _c;
                (_a = this.pricesTables) === null || _a === void 0 ? void 0 : _a.addPriceToBuy(EsiosApiClient._getPvpC(element));
                (_b = this.pricesTables) === null || _b === void 0 ? void 0 : _b.addPricetoSell(EsiosApiClient._getPmh(element));
                (_c = this.pricesTables) === null || _c === void 0 ? void 0 : _c.addEnergyTerm(EsiosApiClient._getTEU(element));
            });
            onSucess(res, this.pricesTables);
        })
            .catch(error => {
            onError(error);
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
        item.setPrice(parseFloat(serItem.PMHPCB.toString().replace(/,/g, '.')));
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
}
exports.EsiosApiClient = EsiosApiClient;
