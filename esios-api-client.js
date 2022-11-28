const axios = require('axios');
const LocalDateTime = require('@js-joda/core').LocalDateTime;
const LocalDate=require('@js-joda/core').LocalDate;
const ChronoUnit=require("@js-joda/core").ChronoUnit;
const DateTimeFormatter=require('@js-joda/core').DateTimeFormatter;
const Interval=require('@js-joda/extra').Interval;
const Instant=require('@js-joda/core').Instant;
const ZoneId=require('@js-joda/core').ZoneId;
const EsiosApiClient=require("./build/EsiosApiClient.js");


const Map = require("collections/map");
const { PricesTables } = require('@virtualbat/entities/dist/src/PriceTables.js');


class PmhItem{

    /*
     {
                "value": 214.09,
                "datetime": "2022-05-15T00:00:00.000+02:00",
                "datetime_utc": "2022-05-14T22:00:00Z",
                "tz_time": "2022-05-14T22:00:00.000Z",
                "geo_ids": [
                    3
                ]
            }
            */
    constructor(pmhItem){
        let parcheTime=pmhItem.datetime.split(".")[0]+"+"+pmhItem.datetime.split(".")[1].split("+")[1];
        this.value=pmhItem.value;
        //this.datetime=LocalDateTime.parse(pmhItem.datetime,DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'.'SZ"));
        this.datetime=LocalDateTime.parse(parcheTime,DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        this.datetime_utc=pmhItem.datetime_utc;
        this.tz_time=pmhItem.tz_time;
        this.interval=this.getInterval();
    }

    getInterval(){
        let endDateTime=this.datetime.plusHours(1);
        let startInstant=this.datetime.atZone(ZoneId.of("Europe/Madrid")).toInstant();
        let endInstant=endDateTime.atZone(ZoneId.of("Europe/Madrid")).toInstant();
        return new Interval(startInstant,endInstant);
    }

    getPrice(){
        return this.value;
    }
}

module.exports = function(RED) {
    var looper=null;
    



    function EsiosApiClientNode(config) {
        
        
        RED.nodes.createNode(this,config);
        var node = this;
        
        var apiToken=config.apiToken;
        var pvpcEndpoint=config.pvpcEndpoint;
        var pmhEndpoint=config.pmhEndpoint;
        var teuEndpoint="https://api.esios.ree.es/indicators/10393";
        var refreshPeriod=config.refreshPeriod||300;
        var esiosApiClient=new EsiosApiClient.EsiosApiClient();

        this.on('close', function() {
            clearTimeout(looper);
            pricesTables.reset();
        });

        mainProcess();


        function mainProcess(){
            _requestData();
        }

        function _requestData(){
            esiosApiClient.requestPrices(pvpcEndpoint,apiToken).then(req=>{
                esiosApiClient.requestPriceToSellIndicator(pmhEndpoint,apiToken).then(req=>{
                    node.send({payload:{pricesTables:esiosApiClient.pricesTables.get()}});
                    clearTimeout(looper);
                    looper=setTimeout(_requestData,calcTimeOutToCall());
                });

            }).catch((error)=>{
                console.log("Se produjo un error en la llamada "+error);
            });
            

           /* esiosApiClient.requestPrices(pvpcEndpoint,apiToken,(res,pricesTables)=>{
                requestSellPrices();
            },(error)=>{
                _onError(error);
            }).then(()=>{
              
            }).then()*/
        }

        function _onError(error){
            node.status({fill:"red",shape:"dot",text:"Error: "+error});
            throw error;
            
        }

        function setNodeStatus(res){
            if(res.status===200){
                    node.status({fill:"green",shape:"dot",text:"connected"});
            }else{
                node.status({fill:"red",shape:"dot",text:"Cannot connect: "+res.status});
            }
        }

        function calcTimeOutToCall(){
            let nexUpdateAt=LocalDateTime.now().plusDays(1).withHour(0).withMinute(1).withSecond(0).withNano(0);
            let gap=(LocalDateTime.now().until(nexUpdateAt,ChronoUnit.SECONDS))*1000;
            if(gap<=0){
                return 15000;
            }
            node.log("ESIOS CLIENT Next reload at "+gap);
            return gap;
        }
    }

    
    RED.nodes.registerType("esios-api-client",EsiosApiClientNode);
}
