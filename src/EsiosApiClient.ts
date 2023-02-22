import { DateTimeFormatter, LocalDate, LocalDateTime, ZonedDateTime, ZoneId,ChronoUnit } from "@js-joda/core";
import { Interval } from "@js-joda/extra";
import {PmhItem, PmhItemSerialized, PriceIntervalItem, PricesTables, PvpcItem, PvpcItemSerialized} from "@virtualbat/entities/dist/src";
import axios from "axios";
import { AxiosRequestConfig } from "axios";
import '@js-joda/timezone'
import { isMetaProperty } from "typescript";

export class EsiosApiClient{
    pricesTables:PricesTables|null=null;
    hoursOffset:number=0;

    constructor(){
        this.pricesTables=new PricesTables();
    }

    setHoursOffset(hourOffset:number){
      this.hoursOffset=hourOffset;
    }
    getHoursOffset():number{
      return this.hoursOffset;
    }

    requestPrices(endPoint:string,apiToken:string):Promise<any>{
      console.log(arguments);
        return axios
          .get(endPoint,{params:{
            date:LocalDateTime.now().format(DateTimeFormatter.ofPattern('yyyy-MM-dd'))
          },headers:{
            "x-api-key":apiToken
          }
        })
          .then(res => {
            console.log("QUERY PVPC RESOLVED");
              res.data.PVPC.forEach((element:any) => {
                this.pricesTables?.addPriceToBuy(EsiosApiClient._getPvpC(element,this.hoursOffset));
   //             this.pricesTables?.addPricetoSell(EsiosApiClient._getPmh(element));
                this.pricesTables?.addEnergyTerm(EsiosApiClient._getTEU(element,this.hoursOffset));
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
    requestPriceToSellIndicator(endPoint:string,apiToken:string):Promise<any>{
      let start_time=LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
      let end_time=LocalDateTime.now().withHour(23).withMinute(0).withSecond(0).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
      console.log(arguments
        ,{range:{start_time:start_time,end_time:end_time}}
        );
      
      return axios
        .get(endPoint,{params:{
          start_date:start_time,
          end_date:end_time
        },headers:{
          'x-api-key': apiToken 
        }
      })
        .then(res => {
          console.log("RESPONSE:"+JSON.stringify(res.data));
            res.data.indicator.values.forEach((element:any) => {
              let item:PriceIntervalItem=new PriceIntervalItem();
              item.setInterval(EsiosApiClient._getValueInterval(element));
              item.setPrice(element.value);              
              this.pricesTables?.addPricetoSell(item);
            });
                
        });
    }


   private static _getPvpC(serItem:any,hourOffset:number):PriceIntervalItem{
      let item:PriceIntervalItem=new PriceIntervalItem();
      item.setInterval(EsiosApiClient._getInterval(serItem,hourOffset));
      item.setPrice(parseFloat(serItem.PCB.toString().replace(/,/g, '.')));
      return item;
    }

    private static _getPmh(serItem:any,hourOffset:number):PriceIntervalItem{
      let item:PriceIntervalItem=new PriceIntervalItem();
      item.setInterval(EsiosApiClient._getInterval(serItem,hourOffset));
      if(serItem.PMHPCB!==undefined){
        item.setPrice(parseFloat(serItem.PMHPCB.toString().replace(/,/g, '.')));   
      }
      return item;
    }

    private static _getTEU(serItem:any,hourOffset:number):PriceIntervalItem{
      let item:PriceIntervalItem=new PriceIntervalItem();
      item.setInterval(EsiosApiClient._getInterval(serItem,hourOffset));
      item.setPrice(parseFloat(serItem.TEUPCB.toString().replace(/,/g, '.')));
      return item;
    }
    
    private static _getInterval(serItem:any,hourOffset:number):Interval{
            let startHour=Number.parseInt(serItem.Hora.split("-")[0])+hourOffset;
            let startDateTime=LocalDate.parse(serItem.Dia,DateTimeFormatter.ofPattern("dd/MM/yyyy")).atTime(startHour,0,0,0);
            let endDateTime=startDateTime.plusHours(1);
            let startInstant=startDateTime.atZone(ZoneId.of("Europe/Madrid")).toInstant();
            let endInstant=endDateTime.atZone(ZoneId.of("Europe/Madrid")).toInstant();
            return Interval.of(startInstant,endInstant);
        }

    private static _getValueInterval(serItem:any):Interval{
      let startDateTime=LocalDateTime.parse(serItem.datetime,DateTimeFormatter.ISO_OFFSET_DATE_TIME);
      let endDateTime=startDateTime.plusHours(1);
      let startInstant=startDateTime.atZone(ZoneId.of("Europe/Madrid")).toInstant();
      let endInstant=endDateTime.atZone(ZoneId.of("Europe/Madrid")).toInstant();
      return Interval.of(startInstant,endInstant);
    }

    /*getPVPCPrices(pvpcEndpoint:string,apiToken:string,onSucess:Function,onError:Function):Promise<any>{   
        console.log(arguments);
        return axios
          .get(pvpcEndpoint,{params:{
            date:LocalDateTime.now().format(DateTimeFormatter.ofPattern('yyyy-MM-dd'))
          },headers:{
            "Authorization":'Token token="'+apiToken+'"'
          }
        })
          .then(res => {
            console.log("QUERY PVPC RESOLVED");
              res.data.PVPC.forEach((element:PvpcItemSerialized) => {
                this.pricesTables?.addPriceToBuy(new PvpcItem(PvpcItemSerialized.of(element)));
              });
              onSucess(res,this.pricesTables);                
          })
          .catch(error => {
            onError(error);
          });
    }


    getPMHPrices(pmhEndpoint:string,apiToken:string,onSucess:Function,onError:Function){   
        console.log(arguments);
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
              res.data.indicator.values.forEach((element:PmhItemSerialized) => {
                this.pricesTables?.addPricetoSell(PmhItem.of(element));
              });                
              onSucess(res,this.pricesTables);
          })
          .catch(error => {
            onError(error);
            console.error(error);
          });
    }

    getTEUPrices(pmhEndpoint:string,apiToken:string,onSucess:Function,onError:Function){   
        console.log(arguments);
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
             console.log("QUERY TEU RESOLVED");
             let teuMap:Map<Interval,PriceIntervalItem>=new Map();
              res.data.indicator.values.forEach((element:any) => {
                
                if(element.geo_id===8741){
                    let myItem:PriceIntervalItem=new PriceIntervalItem();
                    let parcheTime=element.datetime.split(".")[0]+"+"+element.datetime.split(".")[1].split("+")[1];
                    let startIntervalDate:LocalDateTime=LocalDateTime.parse(parcheTime,DateTimeFormatter.ISO_OFFSET_DATE_TIME);
                    let endIntervalDate:LocalDateTime=startIntervalDate.plusHours(1);
                    
                    myItem.setInterval(Interval.of(startIntervalDate.atZone(ZoneId.of("Europe/Madrid")).toInstant(),endIntervalDate.atZone(ZoneId.of("Europe/Madrid")).toInstant()));
                    myItem.setPrice(element.value);
                    teuMap.set(myItem.getInterval(),myItem);
                }

              });                
              this.pricesTables?.setEnergyTerm(teuMap);
              onSucess(res,this.pricesTables);
          })
          .catch(error => {
            onError(error);
            console.error(error);
          });
    }*/

   /* getTPPrices(pmhEndpoint:string,apiToken:string,onSucess:Function,onError:Function){   
        console.log(arguments);
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
              res.data.indicator.values.forEach((element:PmhItemSerialized) => {
                this.pricesTables?.addPricetoSell(PmhItem.of(element));
              });                
              onSucess(res,this.pricesTables);
          })
          .catch(error => {
            onError(error);
            console.error(error);
          });
    }*/
}