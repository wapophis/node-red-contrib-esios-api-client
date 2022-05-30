const axios = require('axios');
const LocalDateTime = require('@js-joda/core').LocalDateTime;
const LocalDate=require('@js-joda/core').LocalDate;
const ChronoUnit=require("@js-joda/core").ChronoUnit;
const DateTimeFormatter=require('@js-joda/core').DateTimeFormatter;
const Interval=require('@js-joda/extra').Interval;
const Instant=require('@js-joda/core').Instant;
const ZoneId=require('@js-joda/core').ZoneId;


require("@js-joda/timezone");

const Map = require("collections/map");

class PricesTables{
    constructor(){
        this.pricesToSell=new Map();
        this.pricesToBuy=new Map();
    }

    addPriceToBuy(pvpcItem){
        this.pricesToBuy.set(pvpcItem.interval,pvpcItem);
    }

    addPricetoSell(pmhItem){
        this.pricesToSell.set(pmhItem.interval,pmhItem);
    }

    get(){
        let msg={};
        msg.payload={pricesTables:{
            pricesToSell:this.pricesToSell.toObject(),
            pricesToBuy:this.pricesToBuy.toObject()
            }
        }
        return msg;
    }

    reset(){
        this.pricesToSell.clear();
        this.pricesToBuy.clear();
    }
}

class PvpcItem{
    constructor(fromEsios){
        {
            this.dia= fromEsios.Dia;
            this.hora= fromEsios.Hora;
            this.PCB= fromEsios.PCB;
            this.TEUPCB= fromEsios.TEUPCB;
            ///this.timeInterval=Interval.of(Instant.)
            this.interval=this.getInterval();
        }
    }

    getInterval(){
        let startHour=this.hora.split("-")[0];
        let startDateTime=LocalDate.parse(this.dia,DateTimeFormatter.ofPattern("dd/MM/yyyy")).atTime4(startHour,0,0,0);
        let endDateTime=startDateTime.plusHours(1);
        let startInstant=startDateTime.atZone(ZoneId.of("Europe/Madrid")).toInstant();
        let endInstant=endDateTime.atZone(ZoneId.of("Europe/Madrid")).toInstant();
        return new Interval(startInstant,endInstant);
    }

    getPrice(){
        return parseFloat(this.PCB.replace(/,/g, '.'));
    }

    getPeaje(){
        return this.TEUPCB;
    }

}

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
    

    var pricesTables=new PricesTables();

    function EsiosApiClientNode(config) {
        
        
        RED.nodes.createNode(this,config);
        var node = this;
        
        var apiToken=config.apiToken;
        var pvpcEndpoint=config.pvpcEndpoint;
        var pmhEndpoint=config.pmhEndpoint;
        var refreshPeriod=config.refreshPeriod||300;

        this.on('close', function() {
            clearTimeout(looper);
            pricesTables.reset();
        });

        mainProcess();


        function mainProcess(){
            getPVPCPrices().then(function(){
                clearTimeout(looper);
                looper=setTimeout(getPVPCPrices,calcTimeOutToCall());
            });
        }

        function getPVPCPrices(){   
            return axios
              .get(pvpcEndpoint,{params:{
                date:LocalDateTime.now().format(DateTimeFormatter.ofPattern('yyyy-MM-dd'))
              },headers:{
                "Authorization":'Token token="'+apiToken+'"'
              }
            })
              .then(res => {
                console.log("QUERY PVPC RESOLVED");
                  res.data.PVPC.forEach(element => {
                    pricesTables.addPriceToBuy(new PvpcItem(element));
                  });                
                  setNodeStatus(res);
                  getPMHPrices().then(function(){
                    node.send(pricesTables.get());
                  });
              })
              .catch(error => {
                node.status({fill:"red",shape:"dot",text:"Error: "+error});
                console.error(error);
              });
        }


        function getPMHPrices(){   
            return axios
              .get(pmhEndpoint,{params:{
                start_date:LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0).format(DateTimeFormatter.ofPattern('yyyy-MM-dd HH:mm:ss'))
                ,end_date:LocalDateTime.now().withHour(23).withMinute(59).withSecond(59).withNano(0).format(DateTimeFormatter.ofPattern('yyyy-MM-dd HH:mm:ss'))
                ,geo_agg:"sum"
                ,geo_ids:""
                ,time_trunc:"hour"
                ,time_agg:""
                ,locale:"es"
                
              },headers:{
                "Authorization":'Token token="'+apiToken+'"'
              }
            })
              .then(res => {
                 // console.log(res);
                 console.log("QUERY PMH RESOLVED");
                  res.data.indicator.values.forEach(element => {
                    pricesTables.addPricetoSell(new PmhItem(element));
                  });                
                  setNodeStatus(res);
              })
              .catch(error => {
                node.status({fill:"red",shape:"dot",text:"Error: "+error});
                console.error(error);
              });
        }

        function setNodeStatus(res){
            if(res.status===200){
                    node.status({fill:"green",shape:"dot",text:"connected"});
            }else{
                node.status({fill:"red",shape:"dot",text:"Cannot connect: "+res.status});
            }
        }

        function calcTimeOutToCall(){
            let nexUpdateAt=LocalDateTime.now().plusDays(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
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
