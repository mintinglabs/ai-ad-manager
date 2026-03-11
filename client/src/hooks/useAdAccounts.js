const MOCK_AD_ACCOUNTS = [
  // Digital Media Group (566372936820297)
  { id: 'act_51743032',         account_id: '51743032',         name: 'PressLogic Overseas Editorial Use Only',         account_status: 1, currency: 'USD', business_id: '566372936820297', business_name: 'Digital Media Group' },
  { id: 'act_777215739403367',  account_id: '777215739403367',  name: 'PopLady Magazine',                               account_status: 1, currency: 'HKD', business_id: '566372936820297', business_name: 'Digital Media Group' },
  { id: 'act_677897016316587',  account_id: '677897016316587',  name: 'TopBeauty',                                      account_status: 1, currency: 'HKD', business_id: '566372936820297', business_name: 'Digital Media Group' },
  { id: 'act_774215116334675',  account_id: '774215116334675',  name: 'BusinessFocus',                                  account_status: 1, currency: 'HKD', business_id: '566372936820297', business_name: 'Digital Media Group' },
  { id: 'act_1381964508647209', account_id: '1381964508647209', name: 'MamiDaily UrbanLife',                            account_status: 1, currency: 'HKD', business_id: '566372936820297', business_name: 'Digital Media Group' },
  { id: 'act_266237934289713',  account_id: '266237934289713',  name: 'Girls Holiday KDaily Cats',                      account_status: 1, currency: 'HKD', business_id: '566372936820297', business_name: 'Digital Media Group' },
  { id: 'act_461113521414440',  account_id: '461113521414440',  name: 'PressLogic advertising',                         account_status: 1, currency: 'USD', business_id: '566372936820297', business_name: 'Digital Media Group' },
  { id: 'act_211752907586646',  account_id: '211752907586646',  name: 'Beauty Advance Technology - Dr. Once',           account_status: 1, currency: 'USD', business_id: '566372936820297', business_name: 'Digital Media Group' },

  // PressLogic Holdings Limited (228003184248072)
  { id: 'act_228005107581213',  account_id: '228005107581213',  name: 'HolidaySmart',                                   account_status: 1, currency: 'HKD', business_id: '228003184248072', business_name: 'PressLogic Holdings Limited' },

  // ChatBooster (242588499820421)
  { id: 'act_1165750745658321', account_id: '1165750745658321', name: 'ChatBooster (Read-Only)',                        account_status: 1, currency: 'USD', business_id: '242588499820421', business_name: 'ChatBooster' },
  { id: 'act_1700990376652748', account_id: '1700990376652748', name: 'Presslogic Taiwan (General boosting)',           account_status: 1, currency: 'TWD', business_id: '242588499820421', business_name: 'ChatBooster' },
  { id: 'act_667459864240113',  account_id: '667459864240113',  name: 'Tapnow Advertising 2',                           account_status: 1, currency: 'USD', business_id: '242588499820421', business_name: 'ChatBooster' },

  // PressLogic HK (1746410362152748)
  { id: 'act_376514553157972',  account_id: '376514553157972',  name: 'HolidaySmart (Pop Media - General boosting)',    account_status: 1, currency: 'HKD', business_id: '1746410362152748', business_name: 'PressLogic HK' },
  { id: 'act_2389619597968175', account_id: '2389619597968175', name: 'Girlstyle Singapore - General Boosting',         account_status: 1, currency: 'SGD', business_id: '1746410362152748', business_name: 'PressLogic HK' },

  // PressLogic Girlstyle - BusinessFocus (596605577458906)
  { id: 'act_589022141668910',  account_id: '589022141668910',  name: 'PressLogic Malaysia - General boosting',         account_status: 1, currency: 'MYR', business_id: '596605577458906', business_name: 'PressLogic Girlstyle - BusinessFocus' },
  { id: 'act_336862867999033',  account_id: '336862867999033',  name: 'TapNow Advertising',                             account_status: 1, currency: 'USD', business_id: '596605577458906', business_name: 'PressLogic Girlstyle - BusinessFocus' },
  { id: 'act_594833791950064',  account_id: '594833791950064',  name: 'GirlStyle HK - General boosting',                account_status: 1, currency: 'HKD', business_id: '596605577458906', business_name: 'PressLogic Girlstyle - BusinessFocus' },
  { id: 'act_309967067400697',  account_id: '309967067400697',  name: 'Pre setup account',                              account_status: 7, currency: 'USD', business_id: '596605577458906', business_name: 'PressLogic Girlstyle - BusinessFocus' },
  { id: 'act_306188281152802',  account_id: '306188281152802',  name: 'Editorial use only - back up account (3rd)',      account_status: 1, currency: 'USD', business_id: '596605577458906', business_name: 'PressLogic Girlstyle - BusinessFocus' },
  { id: 'act_399338465178298',  account_id: '399338465178298',  name: 'Editorial use only (Project) - Oct 2021',        account_status: 1, currency: 'USD', business_id: '596605577458906', business_name: 'PressLogic Girlstyle - BusinessFocus' },
  { id: 'act_2775701619233545', account_id: '2775701619233545', name: 'Maxlytics_Palace Museum',                        account_status: 1, currency: 'USD', business_id: '596605577458906', business_name: 'PressLogic Girlstyle - BusinessFocus' },
  { id: 'act_531664681820558',  account_id: '531664681820558',  name: 'PL Client Boosting (Maxlytics - General)',        account_status: 1, currency: 'USD', business_id: '596605577458906', business_name: 'PressLogic Girlstyle - BusinessFocus' },

  // Weekend Holiday (111137759579857)
  { id: 'act_336358368198260',  account_id: '336358368198260',  name: 'Editorial use only (Editor and marketing)',       account_status: 1, currency: 'USD', business_id: '111137759579857', business_name: 'Weekend Holiday' },
  { id: 'act_442361050841704',  account_id: '442361050841704',  name: 'Pop Media HK - General Boosting',                account_status: 2, currency: 'HKD', business_id: '111137759579857', business_name: 'Weekend Holiday' },
  { id: 'act_283397426901264',  account_id: '283397426901264',  name: 'BusinessFocus - General boosting',               account_status: 1, currency: 'USD', business_id: '111137759579857', business_name: 'Weekend Holiday' },
];

export const useAdAccounts = (_token) => ({
  adAccounts: MOCK_AD_ACCOUNTS,
  isLoading:  false,
  error:      null,
});
