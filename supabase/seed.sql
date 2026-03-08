-- ============================================================
-- seed.sql
-- 1 buyer, 5 suppliers, 5 po_sequences, 50 catalogue items
-- Source: src/mocks/data/refinery_items_50_5suppliers_strict.json
-- ============================================================

BEGIN;

-- ---------- buyer ----------

INSERT INTO buyer (id, name, description)
OVERRIDING SYSTEM VALUE
VALUES (1, 'Alex Morgan', 'Default buyer');

-- ---------- supplier ----------
-- cr_no generated as uppercase slug per plan convention

INSERT INTO supplier (id, name, cr_no, description)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Flexitallic', 'FLEXITALLIC-001', 'Gasket manufacturer'),
  (2, 'Flowserve',   'FLOWSERVE-001',   'Valve and pump manufacturer'),
  (3, 'Emerson',     'EMERSON-001',     'Instrumentation and control valves'),
  (4, 'Alfa Laval',  'ALFALAVAL-001',   'Heat exchanger manufacturer'),
  (5, 'DeWalt',      'DEWALT-001',      'Industrial hand tools');

-- ---------- po_sequences ----------

INSERT INTO po_sequences (supplier_id, current_seq)
VALUES
  (1, 0),
  (2, 0),
  (3, 0),
  (4, 0),
  (5, 0);

-- ---------- catalogue ----------
-- supplier_id: 1=Flexitallic, 2=Flowserve, 3=Emerson, 4=Alfa Laval, 5=DeWalt

INSERT INTO catalogue (supplier_id, name, category, manufacturer, model, price_usd, lead_time_days, in_stock, specifications)
VALUES
  -- Flexitallic gaskets (10 items)
  (1, 'Spiral Wound Gasket 2 in Class 150 RF, 316 SS/Graphite', 'Gasket', 'Flexitallic', 'SWG-FLEX-2IN-150', 95, 5, false,
   '{"supplier":"Flexitallic","standard":"ASME B16.20","nominalSize":"2 in","pressureClass":"ASME 150","face":"RF","windingMaterial":"316 SS","fillerMaterial":"Graphite","innerRing":"316 SS","outerRing":"Carbon Steel"}'::jsonb),

  (1, 'Spiral Wound Gasket 4 in Class 300 RF, 316 SS/Graphite', 'Gasket', 'Flexitallic', 'SWG-FLEX-4IN-300', 28, 3, true,
   '{"supplier":"Flexitallic","standard":"ASME B16.20","nominalSize":"4 in","pressureClass":"ASME 300","face":"RF","windingMaterial":"316 SS","fillerMaterial":"Graphite","innerRing":"316 SS","outerRing":"Carbon Steel"}'::jsonb),

  (1, 'Spiral Wound Gasket 6 in Class 600 RF, 316 SS/Graphite', 'Gasket', 'Flexitallic', 'SWG-FLEX-6IN-600', 95, 14, true,
   '{"supplier":"Flexitallic","standard":"ASME B16.20","nominalSize":"6 in","pressureClass":"ASME 600","face":"RF","windingMaterial":"316 SS","fillerMaterial":"Graphite","innerRing":"316 SS","outerRing":"Carbon Steel"}'::jsonb),

  (1, 'Spiral Wound Gasket 8 in Class 900 RF, 316 SS/Graphite', 'Gasket', 'Flexitallic', 'SWG-FLEX-8IN-900', 62, 3, true,
   '{"supplier":"Flexitallic","standard":"ASME B16.20","nominalSize":"8 in","pressureClass":"ASME 900","face":"RF","windingMaterial":"316 SS","fillerMaterial":"Graphite","innerRing":"316 SS","outerRing":"Carbon Steel"}'::jsonb),

  (1, 'RTJ Gasket R23 Soft Iron (Oval)', 'Gasket', 'Flexitallic', 'RTJ-FLEX-R23-SOFTIR', 140, 21, true,
   '{"supplier":"Flexitallic","standard":"ASME B16.20","ringNumber":"R23","profile":"Oval","material":"Soft Iron","pressureClass":"ASME 600"}'::jsonb),

  (1, 'RTJ Gasket R24 316 SS (Octagonal)', 'Gasket', 'Flexitallic', 'RTJ-FLEX-R24-316SS', 95, 7, false,
   '{"supplier":"Flexitallic","standard":"ASME B16.20","ringNumber":"R24","profile":"Octagonal","material":"316 SS","pressureClass":"ASME 900"}'::jsonb),

  (1, 'RTJ Gasket R35 Soft Iron (Octagonal)', 'Gasket', 'Flexitallic', 'RTJ-FLEX-R35-SOFTIR', 140, 7, false,
   '{"supplier":"Flexitallic","standard":"ASME B16.20","ringNumber":"R35","profile":"Octagonal","material":"Soft Iron","pressureClass":"ASME 1500"}'::jsonb),

  (1, 'PTFE Sheet Gasket Material, 1/16 in Thickness (60x60 in)', 'Gasket', 'Flexitallic', 'SHT-FLEX-1_16in', 18, 3, true,
   '{"supplier":"Flexitallic","standard":"ASTM F104","thickness":"1/16 in","sheetSize":"60x60 in","material":"PTFE","maxTemperature":"200C"}'::jsonb),

  (1, 'CNAF (NBR Binder) Sheet Gasket Material, 1/8 in Thickness (60x60 in)', 'Gasket', 'Flexitallic', 'SHT-FLEX-1_8in', 38, 2, true,
   '{"supplier":"Flexitallic","standard":"ASTM F104","thickness":"1/8 in","sheetSize":"60x60 in","material":"CNAF (NBR Binder)","maxTemperature":"260C"}'::jsonb),

  (1, 'Kammprofile Gasket 10 in Class 300 RF, 316 SS Core / Graphite Facing', 'Gasket', 'Flexitallic', 'KAM-FLEX-10IN-300', 260, 10, true,
   '{"supplier":"Flexitallic","standard":"EN 1514-6","nominalSize":"10 in","pressureClass":"ASME 300","face":"RF","coreMaterial":"316 SS Core","facingMaterial":"Graphite Facing"}'::jsonb),

  -- Flowserve valves and pumps (10 items)
  (2, 'Ball Valve 2 in Class 150', 'Valve', 'Flowserve', 'FLS-BV-2IN-150', 2359, 10, true,
   '{"supplier":"Flowserve","standard":"API 608; ASME B16.34","nominalSize":"2 in","pressureClass":"ASME 150","bodyMaterial":"ASTM A351 CF8M (316)","endConnection":"RF Flanged","trimOrSeat":"Full Port, PTFE seats","nace":"N/A","fireSafe":"API 607"}'::jsonb),

  (2, 'Ball Valve 4 in Class 300', 'Valve', 'Flowserve', 'FLS-BV-4IN-300', 1019, 28, true,
   '{"supplier":"Flowserve","standard":"API 608; ASME B16.34","nominalSize":"4 in","pressureClass":"ASME 300","bodyMaterial":"ASTM A216 WCB","endConnection":"RF Flanged","trimOrSeat":"Full Port, RPTFE seats","nace":"N/A","fireSafe":"API 607"}'::jsonb),

  (2, 'Gate Valve 6 in Class 300', 'Valve', 'Flowserve', 'FLS-GV-6IN-300', 3202, 35, true,
   '{"supplier":"Flowserve","standard":"API 600; ASME B16.34","nominalSize":"6 in","pressureClass":"ASME 300","bodyMaterial":"ASTM A216 WCB","endConnection":"RF Flanged","trimOrSeat":"13Cr trim","nace":"MR0175 compliant","fireSafe":"N/A"}'::jsonb),

  (2, 'Check Valve 6 in Class 600', 'Valve', 'Flowserve', 'FLS-CV-6IN-600', 2406, 35, true,
   '{"supplier":"Flowserve","standard":"API 594; ASME B16.34","nominalSize":"6 in","pressureClass":"ASME 600","bodyMaterial":"ASTM A351 CF8M (316)","endConnection":"RF Flanged","trimOrSeat":"Dual-plate","nace":"N/A","fireSafe":"N/A"}'::jsonb),

  (2, 'Globe Valve 2 in Class 300', 'Valve', 'Flowserve', 'FLS-GLV-2IN-300', 2330, 10, true,
   '{"supplier":"Flowserve","standard":"API 602; ASME B16.34","nominalSize":"2 in","pressureClass":"ASME 300","bodyMaterial":"ASTM A105","endConnection":"RF Flanged","trimOrSeat":"13Cr trim","nace":"MR0175 compliant","fireSafe":"N/A"}'::jsonb),

  (2, 'ANSI Process Pump 6x4-13', 'Pump', 'Flowserve', 'FLS-3196-OH1-6X4-13', 15797, 75, false,
   '{"supplier":"Flowserve","standard":"ANSI B73.1","hydraulicSize":"6x4-13","configuration":"OH1","casingMaterial":"Carbon Steel","ratedFlow":"400 gpm","ratedHead":"180 ft","sealPlan":"API Plan 11","driver":"Explosion-proof motor"}'::jsonb),

  (2, 'ANSI Process Pump 3x2-10', 'Pump', 'Flowserve', 'FLS-3196-OH1-3X2-10', 24365, 45, false,
   '{"supplier":"Flowserve","standard":"ANSI B73.1","hydraulicSize":"3x2-10","configuration":"OH1","casingMaterial":"316 Stainless Steel","ratedFlow":"150 gpm","ratedHead":"220 ft","sealPlan":"API Plan 11","driver":"Explosion-proof motor"}'::jsonb),

  (2, 'API 610 OH2 Pump 4x3-13', 'Pump', 'Flowserve', 'FLS-DMX-OH2-4X3-13', 17198, 45, true,
   '{"supplier":"Flowserve","standard":"API 610","hydraulicSize":"4x3-13","configuration":"OH2","casingMaterial":"Carbon Steel","ratedFlow":"300 gpm","ratedHead":"260 ft","sealPlan":"API Plan 53A","driver":"TEFC motor"}'::jsonb),

  (2, 'API 610 BB2 Pump BB2-10', 'Pump', 'Flowserve', 'FLS-HPX-BB2-BB2-10', 27956, 21, false,
   '{"supplier":"Flowserve","standard":"API 610","hydraulicSize":"BB2-10","configuration":"BB2","casingMaterial":"Carbon Steel","ratedFlow":"650 gpm","ratedHead":"500 ft","sealPlan":"API Plan 52","driver":"Explosion-proof motor"}'::jsonb),

  (2, 'Mag Drive Pump 2x1-6', 'Pump', 'Flowserve', 'FLS-Sealmatic-Sealless-2X1-6', 33072, 45, false,
   '{"supplier":"Flowserve","standard":"ANSI B73.3","hydraulicSize":"2x1-6","configuration":"Sealless","casingMaterial":"316 Stainless Steel","ratedFlow":"70 gpm","ratedHead":"120 ft","sealPlan":"Sealless","driver":"TEFC motor"}'::jsonb),

  -- Emerson instrumentation and control valves (10 items)
  (3, 'Pressure Transmitter (0-300 psi)', 'Instrumentation', 'Emerson', 'Rosemount 3051', 9800, 7, true,
   '{"supplier":"Emerson","measurementType":"Pressure Transmitter","range":"0-300 psi","communication":"4-20 mA + HART","accuracy":"0.075%","hazardousArea":"FM/CSA","processConnection":"1/2in NPT"}'::jsonb),

  (3, 'Differential Pressure Transmitter (0-100 inH2O)', 'Instrumentation', 'Emerson', 'Rosemount 3051DP', 8285, 21, true,
   '{"supplier":"Emerson","measurementType":"Differential Pressure Transmitter","range":"0-100 inH2O","communication":"4-20 mA + HART","accuracy":"0.075%","hazardousArea":"ATEX/IECEx","processConnection":"1/4in NPT"}'::jsonb),

  (3, 'Radar Level Transmitter (0-20 m)', 'Instrumentation', 'Emerson', 'Rosemount 5408', 12881, 14, true,
   '{"supplier":"Emerson","measurementType":"Radar Level Transmitter","range":"0-20 m","communication":"4-20 mA + HART","accuracy":"\u00b13 mm","hazardousArea":"FM/CSA","processConnection":"1/4in NPT"}'::jsonb),

  (3, 'Temperature Transmitter (-50 to 250C)', 'Instrumentation', 'Emerson', 'Rosemount 644', 15311, 7, false,
   '{"supplier":"Emerson","measurementType":"Temperature Transmitter","range":"-50 to 250C","communication":"4-20 mA + HART","accuracy":"0.1%","hazardousArea":"FM/CSA","processConnection":"1/2in NPT"}'::jsonb),

  (3, 'Vibration Transmitter (0-1 in/s)', 'Instrumentation', 'Emerson', 'CSI 9420', 13483, 7, false,
   '{"supplier":"Emerson","measurementType":"Vibration Transmitter","range":"0-1 in/s","communication":"WirelessHART","accuracy":"\u00b12%","hazardousArea":"ATEX/IECEx + FM/CSA","processConnection":"1/4in NPT"}'::jsonb),

  (3, 'Control Valve, Globe 2 in Class 300', 'Valve', 'Emerson Fisher', 'Fisher EZ', 7318, 28, false,
   '{"supplier":"Emerson","standard":"IEC 60534","nominalSize":"2 in","pressureClass":"ASME 300","bodyMaterial":"ASTM A216 WCB","endConnection":"RF Flanged","trim":"Cage guided, equal %","actuation":"Pneumatic diaphragm","positioner":"N/A"}'::jsonb),

  (3, 'Control Valve, Globe 3 in Class 300', 'Valve', 'Emerson Fisher', 'Fisher GX', 3094, 28, true,
   '{"supplier":"Emerson","standard":"IEC 60534","nominalSize":"3 in","pressureClass":"ASME 300","bodyMaterial":"ASTM A351 CF8M (316)","endConnection":"RF Flanged","trim":"Low noise trim","actuation":"Electric actuator","positioner":"Digital positioner"}'::jsonb),

  (3, 'Control Valve, Globe 4 in Class 600', 'Valve', 'Emerson Fisher', 'Fisher ET', 7715, 21, true,
   '{"supplier":"Emerson","standard":"IEC 60534","nominalSize":"4 in","pressureClass":"ASME 600","bodyMaterial":"ASTM A217 WC6","endConnection":"RF Flanged","trim":"Anti-cavitation","actuation":"Pneumatic diaphragm","positioner":"N/A"}'::jsonb),

  (3, 'Control Valve, Globe 1 in Class 800', 'Valve', 'Emerson Fisher', 'Fisher EZ', 8859, 35, false,
   '{"supplier":"Emerson","standard":"IEC 60534","nominalSize":"1 in","pressureClass":"ASME 800","bodyMaterial":"ASTM A182 F316","endConnection":"Socket Weld","trim":"High pressure trim","actuation":"Pneumatic diaphragm","positioner":"Digital positioner"}'::jsonb),

  (3, 'Control Valve, Globe 2 in Class 150', 'Valve', 'Emerson Fisher', 'Fisher GX', 4893, 35, false,
   '{"supplier":"Emerson","standard":"IEC 60534","nominalSize":"2 in","pressureClass":"ASME 150","bodyMaterial":"ASTM A216 WCB","endConnection":"RF Flanged","trim":"General service","actuation":"Pneumatic diaphragm","positioner":"N/A"}'::jsonb),

  -- Alfa Laval heat exchangers (10 items)
  (4, 'Shell and Tube Heat Exchanger 100 sq ft', 'Heat Exchanger', 'Alfa Laval', 'AL-TEMAE-100', 34489, 90, false,
   '{"supplier":"Alfa Laval","designCode":"ASME VIII","temaOrType":"TEMA E","surfaceArea":"100 sq ft","shellMaterial":"Carbon Steel","tubeOrPlateMaterial":"Admiralty Brass","designPressure":"300 psi","designTemperature":"350 F"}'::jsonb),

  (4, 'Shell and Tube Heat Exchanger 180 sq ft', 'Heat Exchanger', 'Alfa Laval', 'AL-TEMAAES-180', 84053, 75, false,
   '{"supplier":"Alfa Laval","designCode":"ASME VIII","temaOrType":"TEMA AES","surfaceArea":"180 sq ft","shellMaterial":"Carbon Steel","tubeOrPlateMaterial":"316L SS","designPressure":"450 psi","designTemperature":"400 F"}'::jsonb),

  (4, 'Plate Heat Exchanger, Gasketed 60 sq ft', 'Heat Exchanger', 'Alfa Laval', 'AL-GasketedPlate-60', 82041, 75, false,
   '{"supplier":"Alfa Laval","designCode":"ASME VIII","temaOrType":"Gasketed Plate","surfaceArea":"60 sq ft","shellMaterial":"316L SS","tubeOrPlateMaterial":"316L SS","designPressure":"230 psi","designTemperature":"300 F"}'::jsonb),

  (4, 'Plate Heat Exchanger, Semi-welded 80 sq ft', 'Heat Exchanger', 'Alfa Laval', 'AL-Semi-weldedPlate-80', 20809, 45, false,
   '{"supplier":"Alfa Laval","designCode":"ASME VIII","temaOrType":"Semi-welded Plate","surfaceArea":"80 sq ft","shellMaterial":"316L SS","tubeOrPlateMaterial":"316L SS","designPressure":"435 psi","designTemperature":"320 F"}'::jsonb),

  (4, 'Air Cooler, Fin Fan 250 sq ft', 'Heat Exchanger', 'Alfa Laval', 'AL-FinFan-250', 31237, 45, false,
   '{"supplier":"Alfa Laval","designCode":"ASME VIII","temaOrType":"Fin Fan","surfaceArea":"250 sq ft","shellMaterial":"Carbon Steel","tubeOrPlateMaterial":"Aluminum fins","designPressure":"150 psi","designTemperature":"250 F"}'::jsonb),

  (4, 'Reboiler Exchanger, Kettle 220 sq ft', 'Heat Exchanger', 'Alfa Laval', 'AL-Kettle-220', 15844, 45, false,
   '{"supplier":"Alfa Laval","designCode":"ASME VIII","temaOrType":"Kettle","surfaceArea":"220 sq ft","shellMaterial":"Carbon Steel","tubeOrPlateMaterial":"316L SS","designPressure":"600 psi","designTemperature":"450 F"}'::jsonb),

  (4, 'Condenser Exchanger 140 sq ft', 'Heat Exchanger', 'Alfa Laval', 'AL-TEMABEU-140', 27764, 90, false,
   '{"supplier":"Alfa Laval","designCode":"ASME VIII","temaOrType":"TEMA BEU","surfaceArea":"140 sq ft","shellMaterial":"Carbon Steel","tubeOrPlateMaterial":"316L SS","designPressure":"300 psi","designTemperature":"350 F"}'::jsonb),

  (4, 'Oil Cooler Exchanger 90 sq ft', 'Heat Exchanger', 'Alfa Laval', 'AL-Shell&Tube-90', 15287, 60, false,
   '{"supplier":"Alfa Laval","designCode":"ASME VIII","temaOrType":"Shell & Tube","surfaceArea":"90 sq ft","shellMaterial":"Carbon Steel","tubeOrPlateMaterial":"CuNi","designPressure":"230 psi","designTemperature":"300 F"}'::jsonb),

  (4, 'Feed/Effluent Exchanger 260 sq ft', 'Heat Exchanger', 'Alfa Laval', 'AL-TEMAAES-260', 52421, 75, false,
   '{"supplier":"Alfa Laval","designCode":"ASME VIII","temaOrType":"TEMA AES","surfaceArea":"260 sq ft","shellMaterial":"Carbon Steel","tubeOrPlateMaterial":"316L SS","designPressure":"450 psi","designTemperature":"420 F"}'::jsonb),

  (4, 'Charge Cooler Exchanger 120 sq ft', 'Heat Exchanger', 'Alfa Laval', 'AL-TEMAE-120', 54644, 90, false,
   '{"supplier":"Alfa Laval","designCode":"ASME VIII","temaOrType":"TEMA E","surfaceArea":"120 sq ft","shellMaterial":"Carbon Steel","tubeOrPlateMaterial":"Admiralty Brass","designPressure":"300 psi","designTemperature":"350 F"}'::jsonb),

  -- DeWalt hand tools (10 items)
  (5, 'Cordless Hammer Drill/Driver 18V XR', 'Hand Tool', 'DeWalt', 'DCD996', 129, 2, true,
   '{"supplier":"DeWalt","toolType":"Drill","voltage":"18V","chuck":"1/2 in","maxTorque":"820 in-lbs","speed":"0-2000 RPM","warranty":"Limited lifetime"}'::jsonb),

  (5, 'Corded 1/2in VSR Drill', 'Hand Tool', 'DeWalt', 'DWD210G', 12, 7, true,
   '{"supplier":"DeWalt","toolType":"Drill","voltage":"120V","chuck":"1/2 in","current":"10A","speed":"0-1200 RPM","warranty":"3 years"}'::jsonb),

  (5, '20oz Rip Claw Hammer', 'Hand Tool', 'DeWalt', 'DWHT51048', 129, 7, true,
   '{"supplier":"DeWalt","toolType":"Hammer","headWeight":"20 oz","handle":"Fiberglass","overallLength":"13.5 in","warranty":"3 years"}'::jsonb),

  (5, '16oz Ball Peen Hammer', 'Hand Tool', 'DeWalt', 'DWHT51004', 59, 4, true,
   '{"supplier":"DeWalt","toolType":"Hammer","headWeight":"16 oz","handle":"Hickory","overallLength":"13 in","warranty":"3 years"}'::jsonb),

  (5, 'Screwdriver Set, Slotted/Phillips 8pc', 'Hand Tool', 'DeWalt', 'DWHT65098', 79, 1, true,
   '{"supplier":"DeWalt","toolType":"Screwdriver","tips":"Slotted/Phillips","count":"8","magnetic":"Yes","warranty":"Limited lifetime"}'::jsonb),

  (5, 'Phillips Screwdriver PH2 6in', 'Hand Tool', 'DeWalt', 'DWHT65022', 12, 4, true,
   '{"supplier":"DeWalt","toolType":"Screwdriver","tip":"PH2","shaftLength":"6 in","magnetic":"Yes","warranty":"1 year"}'::jsonb),

  (5, 'Slotted Screwdriver 1/4in 6in', 'Hand Tool', 'DeWalt', 'DWHT65018', 22, 1, true,
   '{"supplier":"DeWalt","toolType":"Screwdriver","tip":"Slotted 1/4 in","shaftLength":"6 in","magnetic":"No","warranty":"3 years"}'::jsonb),

  (5, 'Adjustable Wrench 10in', 'Hand Tool', 'DeWalt', 'DWHT75498', 15, 2, true,
   '{"supplier":"DeWalt","toolType":"Wrench","length":"10 in","jawCapacity":"1.25 in","finish":"Chrome","warranty":"3 years"}'::jsonb),

  (5, 'Needle Nose Pliers 8in', 'Hand Tool', 'DeWalt', 'DWHT70276', 12, 5, true,
   '{"supplier":"DeWalt","toolType":"Pliers","length":"8 in","cuttingEdge":"Yes","handle":"Bi-material","warranty":"1 year"}'::jsonb),

  (5, 'Utility Knife Retractable', 'Hand Tool', 'DeWalt', 'DWHT10046', 199, 1, true,
   '{"supplier":"DeWalt","toolType":"Knife","bladeType":"Trapezoid","body":"Metal","quickChange":"Yes","warranty":"1 year"}'::jsonb);

-- Reset identity sequences so future inserts get correct next values
SELECT setval(pg_get_serial_sequence('buyer', 'id'), (SELECT MAX(id) FROM buyer));
SELECT setval(pg_get_serial_sequence('supplier', 'id'), (SELECT MAX(id) FROM supplier));
SELECT setval(pg_get_serial_sequence('catalogue', 'id'), (SELECT MAX(id) FROM catalogue));

COMMIT;
