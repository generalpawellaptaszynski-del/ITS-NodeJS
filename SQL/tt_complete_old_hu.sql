/* Finalize HUs that have not been processed in the last two weeks */

INSERT INTO tt_event_archive 
    ( dt, dtend, idplace, idstep, idworker, hu )
      
WITH cte_process_last_step AS
  
  
     ( SELECT p.idstep_grp
            , p.idstep AS idlast_step
            , x.total_steps
         FROM process p
         JOIN ( SELECT idstep_grp
                     , MAX(n) AS max_n
                     , COUNT(*) AS total_steps
                  FROM process
                 WHERE idstep_grp > 0
                 GROUP BY idstep_grp
              ) x ON x.idstep_grp = p.idstep_grp AND x.max_n = p.n
     )

     , cte_finished_events AS
     ( SELECT hu, idstep, dtend
         FROM tt_event
        WHERE hu > 0 AND dtend IS NOT NULL
       UNION ALL
       SELECT hu, idstep, dtend
         FROM tt_event_archive
        WHERE hu > 0
     )

     , cte_finished_hu AS
     ( SELECT DISTINCT h.hu
         FROM hu                      h
         JOIN `order` O on O.id= h.idorder
         JOIN cte_process_last_step pls ON pls.idstep_grp = h.idstep_grp
         JOIN cte_finished_events    fe ON fe.hu = h.hu AND fe.idstep = pls.idlast_step
     )
     
     
     , cte_step_place AS
     ( SELECT idstep
            , MIN(id) AS idplace
         FROM tt_place 
        GROUP BY idstep
      )
      
      , cte_hu_last_activity AS
      ( SELECT hu
             , MAX( dtend ) AS dt_last_activity
          FROM cte_finished_events
         GROUP by hu
      )      

SELECT DATE_ADD( COALESCE( CHLA.dt_last_activity, NOW() ), INTERVAL 1 SECOND) AS dt 
     , DATE_ADD( COALESCE( CHLA.dt_last_activity, NOW() ), INTERVAL 2 SECOND) AS dtend 
     , COALESCE( CSP.idplace, L.id ) AS idplace
     , CPLS.idlast_step AS idstep
     , W.id AS idworker
     , H.hu

  FROM hu H
  JOIN worker                       W ON W.name          = 'Georgievski Filip'
  JOIN `order`                      O ON O.id            = H.idorder
  JOIN cte_process_last_step     CPLS ON CPLS.idstep_grp = H.idstep_grp
  JOIN tt_place                     L ON L.name = 'Packing'
  LEFT JOIN cte_step_place        CSP ON CSP.idstep      = CPLS.idlast_step
  LEFT JOIN cte_hu_last_activity CHLA ON CHLA.hu         = H.hu 

  WHERE H.hu > 0 
/*    AND O.d <= DATE_SUB( CURDATE(),INTERVAL 2 WEEK ) */ /* Old order */
    AND NOT EXISTS ( SELECT NULL FROM cte_finished_hu CFH WHERE CFH.hu = H.hu ) /* Not finished HU */
    /*AND NOT EXISTS ( SELECT NULL from tt_event EA WHERE EA.hu = H.hu AND EA.dt > DATE_SUB( CURDATE(),INTERVAL 2 WEEK ) ) */ /* No events in 2 weeks for this hu */
    AND CONCAT(O.name, '_', O.name2) NOT IN
  ( '5581_262/SSI'         
  , '5574_259/SSI - АЛУМИНИУМ'         
  , '5488_212/SSI'         
  , 'P00042_020/SSI-FEDS'    
  , '5588_263/SSI'         
  , '5547_243/SSI - РОСТФРАЈ'         
  , '5579_261/SSI - РОСТФРАЈ'         
  , '5152_018/SSI - БЕЗ ОЗНАКИ - САМО ДАТА'         
  , '5529_237/SSI - РОСТФРАЈ - ОТВАРАЊЕ 540 мм.'         
  , '5578_260/SSI - СТАРА КОЦКА'         
  , '5573_258/SSI - СТАРА КОЦКА - РЕВ.1'         
  , '385_026/RADIA'       
  , '1013798_030/STOXX'       
  , '1355_029/SUS - БУШЕЊЕ 50-50-50 - ОТВОРИ ЗА ШТРАФ ЗА КОЧЕЊЕ М8'         
  , '1354_028/SUS - БУШЕЊЕ 50-50-50 - ОТВОРИ ЗА ШТРАФ ЗА КОЧЕЊЕ М8'         
  , '1356_030/SUS - РОСТФРАЈ'         
  , '1357_031/SUS - СО РАДИУС - ОТВАРAЊЕ 650 мм, СЛОТ 11 мм.'         
  , '0000_032/SUS - СО РАДИУС - ОТВАРАЊЕ 650мм, СЛОТ 11мм.'         
  , '51160_022.1/LES - ПОСЕБНО ГРАВИРАЊЕ'
  , '51160_022.2/LES - ПОСЕБНО ГРАВИРАЊЕ'
  , '51160_022/LES - ПОСЕБНО ГРАВИРАЊЕ'
  , '2603004159_005.1/HA-CO-CH - ПОСЕБНО ГРАВИРАЊЕ'
  , '2603004159_005/HA-CO-CH - ПОСЕБНО ГРАВИРАЊЕ'
  , '2027-52472_009/HA-CO-A - ПО ЦРТЕЖ - ПОД 45° - СО ГУМЕНИ ШТРАФОВИ - ПОСЕБНО ГРАВИРАЊЕ'
  , '2027-52472_009/HA-CO-A - ПО ЦРТЕЖ - ПОД 45° - СО ГУМЕНИ ШТРАФОВИ - СРЕДЕН ДЕЛ ОД 25х12 - ПОСЕБНО ГРАВИРАЊЕ'
  , '2027-52436_009.1/HA-CO-A - ПОСЕБНО ГРАВИРАЊЕ'   
  , '2026-015/HA-CO-D - ПОСЕБНО ГРАВИРАЊЕ'     
  , '007_001/EUROPARTS - ОТВАРАЊЕ 2920мм. - БЕЗ ГРАВИРАЊЕ'   
  , '007_001/EUROPARTS - ОТВАРАЊЕ 2920мм. - БЕЗ ГРАВИРАЊЕ - ПО ЦРТЕЖ'   
  , '007_001.1/EUROPARTS - ОТВАРАЊЕ 2411мм. - БЕЗ ГРАВИРАЊЕ - ПО ЦРТЕЖ' 
  , '007_001.2/EUROPARTS - ОТВАРАЊЕ 2160мм - БЕЗ ГРАВИРАЊЕ - ПО ЦРТЕЖ' 
  , '007_001.3/EUROPARTS - ОТВАРАЊЕ 2610мм. - БЕЗ ГРАВИРАЊЕ - ПО ЦРТЕЖ' 
  )    
 
