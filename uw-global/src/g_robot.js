/**
 * Created by Administrator on 2015/10/15.
 */
var PkOutEntity = require("uw-entity").PkOutEntity;
var HeroEntity = require("uw-entity").HeroEntity;
var UserEntity = require("uw-entity").UserEntity;


var c_nameData = require("uw-data").c_nameData;

var t_monster = require("uw-data").t_monster;
var t_wing = require("uw-data").t_wing;
var t_itemEquip = require("uw-data").t_itemEquip;
var t_robot = require("uw-data").t_robot;
var c_prop = require("uw-data").c_prop;
var t_hero = require("uw-data").t_hero;
var commonUtils = require("uw-utils").commonUtils;

var heroPropHelper = null;
var checkRequire = function(){
    heroPropHelper = require("uw-hero").heroPropHelper;
}

var robotMap = {};//{"id":数据,...}
var robotLvlMap = {};//{"lvl":[数据，数据],...}
var uid = 0;

var robotMaleNameArr = ["尤辕和","弘兴庆","韩丰茂","刘鸿哲","厉俊拔","叶博厚","端木曲","郦文山","傅元","陆安","凤丰茂","水西双","凤经义","焦睿聪","国乐容","宰无","林辕和","沈烨煜","亓同甫","谈文光","詹高杰","荣浩初","曾朝","詹尚","仲孙阳曜","别安康","伊新","濮阳元嘉","穆景天","仲阴","井嘉颖","东经略","冉子民","季阳德","隆哲圣","霍杭","暨原","季乐容","徐建安","百里学","时山","边元亮","夏侯玉堂","夹谷乐安","仰驷丘","缪光临","钱高远","薛泰河","钟离德寿","鱼宏畅","殴明智","廉华晖","叶志文","毋德寿","廉成益","别良材","霍瀚玥","咸安康","鲁茂实","孙飞英","解英悟","轩立轩","仰宏畅","皇甫彬炳","盛泰宁","皮华晖","章安宜","陶鹏运","东门祺然","慕容烨煜","缪浩淼","高兴朝","仲乐悦","暨楼","厍俊拔","方俊材","田玉宸","刁伟诚","章光亮","伊狐镇","仉督飞翔","席嘉禧","阙茂材","蒯宏深","于官辉","郁佴新","年爱文","蒋修永","皇甫楼","寇彰","子车兴怀","竺崇","东特","况宏峻","阙涵煦","娄饶","江田","耿田","顾安志","钟鸿飞","墨哈兴学","满玉堂","浦承德","鲍宾实","詹安宜","隗祺祥","屠昊焱","权阳曜","司西双","咎怀","张德泽","樊曾琪","司兴庆","季浩瀚","伏茂实","党心思","常正青","訾博雅","国镇","何烨磊","融华晖","谈屠兵","双正谊","袁奇迈","浦西威","后泰河","尹天磊","厉庆","越源","东乐容","融宏深","班驷厚","柴英逸","逄白","臧肇","庄翰池","隆郸","蔚天磊","公羊朝","寿德元","栾绩","缪彭祖","郎玉宸","郜茂实","班光启","白向荣","牧修","顾阳辉","温锐志","葛浩言","伏光霁","禹学","祁才俊","麴迟垣","项普","史光远","顾经略","妫海安顺","季心水","闵玉书","端木飞跃","洪?崇","翁宏阔","吴康成","闻成益","寇鹏程","步宏深","尉迟正诚","冀泉","贝博容","皇甫鹏运","贲奇伟","伏山","雍无","秦信瑞","子车明智","林鹏程","温集","山驷厚","史浩邈","屠阳辉","纪健柏","魏景焕","丁温瑜","郤乐悦","高修永","章山","薛华藏","呼延修竹","弘前","黄文康","国才俊","伊泰平","平翰海","姚容","伯赏明诚","叶高懿","濮阳英奕","殷宜民","范中","柳锦","汪和怡","倪原","巩飞翔","东门浩邈","申子昂","师翰音","井才俊","周子昂","匡文光","宿嵊","闻人高懿","危义","昌英悟","扈盟","崔肇","江鹏","公羊高杰","薛易","何兴怀","夏侯元亮","童永","戈郸","魏明智","陆嘉禧","薛祺祥","任原","妫海兴怀","南门阳舒","徐弘毅","殷高阳","弘庆生","燕明智","陆狐生","施飞翔","甄乐欣","呼玉宸","冉越泽","吴甫阳","山凯旋","景尧","夏侯郸","赖俊远","贾景","东门乐安","终楼","卞自明","饶高寒","融经武","邓博厚","熊明珠","解阳德","权立果","晋楚锐精","宿丰茂","公西普","符蛟","游文乐","景政蒙","倪官辉","简乐欣","隗浩轩","申屠高杰","童和光","岑良骏","公羊正谊","轩永元","臧凯风","魏庆生","凤罕","熊曾琪","乜宾实","公羊安宁","衡弘义","裴盟","符建义","时光霁","崔高远","蓟高懿","邹鸿飞","项明达","温元武","蒋明珠","慕奇迈","甘俊材","麻兴怀","危屠兵","戚治","国经武","赖安","井?浩气","东门修","郜光启","高德寿","党志行","索鹏程","熊和畅","范康复","景烨磊","慕兴朝","隆驷彪","涂英奕","殷回","茹良材","广浩瀚","段瀚玥","亓茂材","葛建义","鄂特","冉经略","经辛","干同甫","向安宜","贾自明","仲特","养奇迈","冀超","毕钦平","洪鹏程","任康顺","红辕和","端源","田兴","后志尚","利建义","谈华晖","梅嘉许","姚临","古志文","梁丘文石","殳高懿","谈沧","高翰飞","经烨煜","夏侯盟","邓宏浚","逄和洽","妫海尚","尉锐精","邢睿聪","魏安志","蒯嘉颖","焦泰宁","施肇","褚同甫","东方浩邈","蓝俊材","包奇思","梁丘正信","朱意蕴","安良材","娄鸿飞","梁丘族","莫巴","林饶","康明朗","甄镇","羿锐志","伏甫阳","方旭","毋文光","逯涵畅","经锐志","狄德业","钟离高旻","樊意蕴","时博艺","百里文","闻人彰","臧兴怀","熊星华","屈怀","苗祺祥","乐圣杰","曾德水","广官辉","裴辛","公冶鸿雪","广崇","师曾琪","鞠嘉平","厉阳曦","满庆生","鲍钦平","郁越泽","滑德寿","支绥","尹光亮","匡锐利","柏浩轩","养阳舒","匡乐章","诸烨赫","阮德明","羊舌鹏","廉中","屈同甫","利文曜","权高阳","公西翰池", "山宏深","年爱连","井?盛","谈锐精","殴高杰","郑安志","后修","方鸿雪","简明诚","谈顺","涂泰宁","西永安","东门钦平","舒庆生","敖浦","白立轩","陶辕和","闻人康德","叶元德","双文瑞","伏翰学","双奇迈","路温茂","严景曜","劳鸿","禄博学","仉督翰飞","谷粱乐山","双文翰","任弘扬","陆鸿哲","柴平","尚鸿朗","万浩气","师建修","戈乐容","蔡朔","吉官辉","霍博厚","侯乐章","西建义","袁烨煜","宋欣荣","孙绍元","亓修竹","叶和玉","陶官辉","金钦平","澹俊杰","终浩瀚","嵇永宁","辛康复","尤光临","沈兴安","危嵊","云璞瑜","况尧","厍文乐","那彰","空文瑞","訾鹏程","能德泽","茹经略","经高杰","麻嘉容","鲁朝","文鸿波","严成益","晋楚元武","上官良翰","轩超","牛修永","殴兴怀","公冶华藏","谈天佑","尉迟文曜","魏兴学","丁正信","张光亮","姚治","尹乐生","谷粱绩","殳心水","山政蒙","耿浩轩","翟光远","耿翰音","施普","禄嘉平","闫法康宁","易俊远","况浦","温弘义","亓官俊豪","厉尔","车温茂","简俊名","余元德","逄彰","舒兴朝","丁和畅","樊语堂","支兴","罗尔","韩汾","国锐利","郭里兴","陶永言","毛安","暴锦","左巍然","姬修诚","孙临","易庐","郭天佑","那光亮","越俊豪","殳庆","尉迟宏畅","宣飞翔","洪博厚","仰嘉平","呼延华藏","焦健柏","令狐宏浚","端康宁","郑越泽","终宜春","刁德泽","茅翰学","冯翰池","亓官涵畅","尹安宜","空景","慎回","荀义","赵乐安","李公","空乐欣","禄中","公西欣荣","刁君浩","包翰音","禹飞文","訾楼","弘白","栾鸿雪","宗政汾","孙罕","敖永元","寿烨磊","屈和洽","伊绥","刘景焕","莫翰海","相嘉许","诸阳曜","张康宁","敖佴平","裴鸿飞","公回","熊辛","贾越泽","蓟高懿","殷鸿哲","暨朋","麻永宁","蔺和","郭彭祖","唐嘉容","从心水","鲍临","宰父抚","师同甫","桂浩淼","陶和畅","舒族","麴乐悦","胡信瑞","景安","祁绥","田宿","暨宿","周古","乐开宇","乐正博雅","金沧","慎兴安","嵇博厚","仲孙兴生","湛官辉","阮光启","童博艺","宗宏深","瞿和洽","红嘉石","乌语堂","山蕴藉","荀彭祖","蔺浩邈"];
var robotFemaleNameArr = ["蔚友易","胡娜","厉亿","宰宫瑶","洪蓝","东知睿","江雁菱","冉芳蕙","毋阳霁","文梓颖","荣新晴","宫念","章亦寒","殷好慕","顾若烟","朱静程","舒湉湉","商牟谷","谈忆雪","仰馨","应微月","濮孤萍","东怀慕","仉督蓉亭","詹其雨","濮新烟","范如霜","季颐然","尉晓","尤欣笑","古芮优","冉初蝶","季幻枫","蔺雨灵","燕笑","荣荔","邬慧雅","殳思娜","武珍","皇甫桂芝","苗妙梦","咎桃","宗政悦心","闫炫","赫连苹","崔甘泽","何丹扬","终冰绿","鲁良妙","皇娴","公冶友易","蓝若烟","叶青文","闵凝心","牛琴","寿冬灵","辛婧慈","宋孙琳","澹美偲","郭沛白","洪?小楠","宰父颐然","澹双","钟幻枫","燕波","宰岚","黄甘泽","容希","鲁冰绿","诸月桃","朱修雅","妫海冰安","殷采珊","亓访云","公良逸丽","贾荷","鱼月桃","子车丹萱","熊迎天","慕容木晗","尤睿彤","甘莹","郭皓洁","荣雅","夏冰绿","年爱冬梅","鱼千雁","尉虹颖","赫连姝艳","谢静","郜波","巢孤萍","沙娟秀","饶水彤","巩嵘","李燕","俟芮优","巫马雅洁","辛容冰","闵飞荷","南宫曼","戈松雨","国燕妮","墨哈莞然","陶桂枫","闻人雅洁","段小楠","羿孙琳","山夏菡","章青易","乌飘","诸若蕊","麴访","宗政念芹","闫法良妙","东笑","都芹","东方代云","皮听枫","子姣","蔺琴","逄翠梅","厉思涵","邢曼","施林","廉若蓓","纪婉","何亦","禹若蕊","乜雨柏","云姬","燕月明","宋文漪","沈俏美","印梦兰","宗政萱","方淑慧","时忆梅","周韵","亓幼柏","时姬","有琴悦宜","沈念波","那松雨","皇青易","夏侯代云","屠筠心","越子晨","广烁","郁琴","解梅红","叶诗蕾","诸卉","戚寒","柏小珍","公绿蕊","逄姬","毕湉湉","司思菱","钱修雅","融韵","经婉仪","南宫悦宜","车卉","麴怀","阳佟兰馨","张青文","闻妍","樊笑珊","符嵘","干洋然","逯贞","加文瑶","狄舒","邢雪","何若蕊","罗含卉","钱熙华","翟语风","慎其雨","唐亦寒","牧安静","公西沛白","子车语海","薛虹雨","宿海瑶","任飞槐","范燕舞","阮友珊","申屠欣笑","台雅爱","麴婉","尹南风","申屠黛滢","越丹萱","仲孙霁芸","慕容笑珊","阮以南","劳甘泽","范笑","都荔","雍柔","柳如霜","从海云","咸彦芝","姬若蕊","皮雁菱","亓代梅","充逸致","毛霞","蔡倪","罗沛白","连?悦宜","麴莉","班文漪","屠波","方静丹","陆映秋","尉葛妍","吴代芹","禹孤萍","许凝心","董瑞","公姿蝉","冯修雅","荣芷","呼延思菱","郦斐斐","孙惜萱","鱼雨灵","尉迟姬","陈初雪","子车名姝","康天薇","呼彦芝","颛若蓓","权秋莲","温桂枫","步卉","范晓","胡婷","鲍依风","洪?凡","郑友珊","尤笑","巩亿","江皓洁","梁丘诗蕾","谷粱翠桃","康玉","夏侯含卉","夹谷荣","晁珠","伊琦","包孤菱","时玉","平月","郏婧涵","霍平莹","支含卉","平虹颖","祁炫","谢舒","乐正灿灿","劳曼婉","游子晨","双凡梦","方春梅","滑含卉","邓访","狄寻","濮凡","巢青","焦萱","隆桂枫","墨哈思娜","傅妙思","舒朗然","巫马怜珊","云冬儿","平韵","皇甫俏美","澹沛春","赵静竹","阮莉莉","夏侯痴旋","黄天籁","隆谷蓝","井语海","百里幻枫","百秀雅","农延平","南宫思涵","汤寒云","汤宛","空婕","蒋荔","百新儿","仲孙初翠","林谷蓝","瞿元容","洪?娟秀","呼延月明","充娉","郏千秋","邱冰安","支乐心","寿格菲","文元容","元琳","佘秀媚","平宛凝","孟宛","廉春梅","柴寒云","伍谷","步思菱","柏芷","徐甘泽","逯莲","熊思雁","滑诗筠","连?凤","厉南春","卞若烟","南妙思","廉凡梦","施芮优","郁宁","娄虹颖","钟青易","井凝然","沈连姑","巩春","童雪旋","乐正夏菡","商牟桂华","亓寒","史翠安","韦千秋","席雅爱","呼宁","郑曼香","闫法婷","广沛白","赫连婧涵","羊舌悦宜","申屠寒","岑宛","侯连姑","冉秀媛","万微月","阙延平","司空瑞","暴凝心","彭翠","连?洛妃","鲜于琴","郑水彤","公羊韵","厍慧雅","荣梦兰","禄春","穆小珍","耿荷","尚逸丽","严娜兰","向婧涵","左楚羽","韦倩","齐淼淼","屈晶滢","妫海梦兰","田水桃","从雪","鲁囡","冉蓉亭","南宫幼柏","从霞","路代芹","余幼柏","殳虹颖","从寻","相筠","栾冷卉","宰聪慧","竺良妙","云黛滢","包惜萱","都雪旋","褚宫嫦","公良兰馨","段飞荷","祁娜","通小楠","麻雅爱","邱子童","左希","闫法芳蕙","仉彦芝", "通琴","都忆梅","简荣","刁海云","皮初翠","舒雨灵","谯笪怡木","蔡妙思","饶如凡","柏冷卉","闫法薇","左冬灵","年爱珍","柴容冰","凤斐斐","童乐巧","诸萱","宫青梦","宿方冰","赖曼凡","谢木晗","武湉湉","陆代云","常澜","左瑜璟","夏念波","公瑞","金凡","黄若烟","竺葛妍","史绮琴","尉迟问凝","敖以南","许芷蕾","籍琦","皮问枫","闵秀颖","昌翠梅","加婕","养友易","逄子童","祁桃雨","涂朵儿","卞珠","邢昭","宋荷","郦琇芬","昌卉","蒯容","闻安彤","甄澜","屠琇芬","庄婉","印飞兰","慕容雨柏","郤冷卉","侯忆雪","倪皓洁","伯赏逸美","亓官善","缪琳","尉迟芷蕾","东方菱","隗如霜","经冬儿","唐晓夏","翟清淑","阳佟琇芬","皇甫映","壤秀媚","狄筠心","赫乐心","墨哈芳蕙","宰如凡","蒯洛妃","师秀","谷子晨","郜沛","訾飘","尉迟梅红","融海云","周好慕","南门双","袁访","柴彦芝","伯赏霭","茅笪可","濮阳欣笑","殷柳","郎欣笑","舒露","谢莉莉","詹海瑶","柏荷","古文瑶","尹荔","有琴沛","羊舌文漪","鲁千秋","狄曼寒","尚安彤","云冷卉","上官桂枫","尉翠","凌妙","李沛岚","乐正霞","巫马代云","侯韵","亓若蕊","蒯琴","俟谷蓝","曾千秋","别芷蕾","赵英","詹波","干飘","贺思雁","贺呤","汪妙梦","刘芹","国秀媛","蓝玉","缪安静","利莲","訾静","巢颐然","越代亦","党洛妃","公良洋然","梅新烟","鱼颐然","钟秀颖","乜韵","干笪可","尉雅洁","甘湉湉","谭谷蓝","慕英","利依风","宗政毓","国楚羽","墨哈柳","相波","元天薇","师灵","郭绿蕊","竺佳雨","庄幻枫","呼延梦涵","贲姣","子乐巧","师松雨","赖青文","宋孙琳","鱼如霜","仉飘","艾连姑","呼雅隽","羊舌秀媚","咸好慕","魏好","索青筠","有琴千秋","劳炫","干其雨","井?法芝","羊灵","权霁芸","金盼雁","周曼香","广桂枫","金露","暨南霜","殳香露","胡娜","南宫秀雅","有琴冰绿","柴婕","东门宛凝","呼青易","屈凝然","井韵","孟思涵","杜佳雨","湛琇芳","秦延平","路佳美","司空亦寒","百里幻","厍美偲","呼雨灵","国双文","司妙","班南风","简婕","方芮优","梅音韵","越乐枫","空子晨"];


var RobotObj = function(){
    this.uid = null;//唯一id
    this.robotId = null;//机器人id
    this.pkOutData = null;//野外pk数据
    this.heroList = null;//英雄组 [heroEntity,heroEntity]
    this.otherDataList = null;//其他数据组 [[衣服显示id,武器显示id,翅膀显示id],..]
    this.userData = null;//用户数据
};

//获取数据
exports.getData = function(uid){
    if(Object.keys(robotMap).length<=0){
        _init();
    }
    return robotMap[uid];
};

//根据等级获取
exports.getListByLvl = function(lvl){
    if(Object.keys(robotLvlMap).length<=0){
        _init();
    }

    return robotLvlMap[lvl];
};

//获取名字
var _getName = function(uid,sex){
    if(sex==c_prop.sexKey.male){
        return robotMaleNameArr[uid];
    }else{
        return robotFemaleNameArr[uid];
    }
};


//属性，战斗力，显示id
//初始化数据
var _init = function(){
    checkRequire();
    for(var i = 0;i<3;i++){
        for(var key in t_robot){
            var locRobotId = key;
            uid++;
            var locNewObject = _createNewObj(uid,locRobotId);
            locNewObject.uid = uid;
            robotMap[uid] = locNewObject;
            var locLvlList = robotLvlMap[locNewObject.userData.lvl] || [];
            locLvlList.push(locNewObject);
            robotLvlMap[locNewObject.userData.lvl] = locLvlList;
        }
    }
};

var _createNewObj = function(uid,robotId){
    var t_robotData = t_robot[robotId];
    var robotObj = new RobotObj();
    robotObj.uid = uid;
    robotObj.robotId = robotId;
    var pkOut = new PkOutEntity();
    pkOut.pkValue = t_robotData.pkValue;
    pkOut.highPkValue = t_robotData.pkValue;
    pkOut.killValue = t_robotData.killValue;
    robotObj.pkOutData = pkOut;

    var heroList = [];
    var otherDataList = [];
    var allCombat = 0;
    for(var i =0;i< t_robotData.monsterIdArr.length;i++){
        var locMonsterId = t_robotData.monsterIdArr[i];
        var locTempId = t_robotData.tempIdArr[i];
        var locSex = t_robotData.sexArr[i];
        var locDisplayIds = t_robotData.displayIds[i];
        //获取属性
        var locHero = new HeroEntity();
        /** 序号 **/
        locHero.id = robotId;/*序号*/
        /** 用户id **/
        locHero.userId = 0;/*用户id*/
        /** 模板id **/
        locHero.tempId = locTempId||1;/*模板id*/
        /** 品阶 **/
        locHero.quality = 0;/*品阶*/
        /** 强化 **/
        locHero.intensifyArr = [];/*强化[等级,等级,...] 下标对应装备位置*/
        /** 星级 **/
        locHero.starArr = [];/*星级[星级,星级,...] 下标对应装备位置*/
        /** 宝石 **/
        locHero.gemArr = [];/*宝石[id,id,id,...]下标对应装备位置*/
        /** 翅膀 **/
        locHero.wingArr = [];/*翅膀[id,等级,星级,当前星经验]*/
        /** 经验 **/
        locHero.expc = 0;/*经验*/
        /** 等级 **/
        locHero.lvl = t_robotData.lvl;/*等级*/
        /** 装备数据 **/
        locHero.equipData = {};/*{&quot;部位&quot;:物品id,....}*/
        /** 技能等级组 **/
        locHero.skillLvlArr = [];/*[技能1等级,技能2等级...]*/
        /** 最终属性组 **/
        locHero.propArr = null;/*最终属性组[值,值]*/
        /** 境界等级 **/
        locHero.realmLvl = 0;/*境界等级*/
        /** 境界符文组 **/
        locHero.realmArr =  [];/*境界符文组  [0,1,2,3,4,5]*/
        /** 性别 **/
        locHero.sex = locSex||1;/*性别 1:男 2:女*/
        /** 属性值 **/
        locHero.propArr =  _calProps(locMonsterId,locHero.tempId);
        /** 战斗力 **/
        locHero.combat = heroPropHelper.calCombat({lvl:t_robotData.lvl,equipBag:{}},locHero);/*战斗力*/
        heroList.push(locHero);


        //[[衣服显示id,武器显示id,翅膀显示id],..]
        var locCurDisplayIds = [];
        var t_clothData = t_itemEquip[locDisplayIds[1]];
        if(locHero.sex==c_prop.sexKey.male){
            locCurDisplayIds[0] = t_clothData.displayID.split(",")[0];
        }else{
            locCurDisplayIds[0] = t_clothData.displayID.split(",")[1];
        }

        var t_wuqiData = t_itemEquip[locDisplayIds[0]];
        locCurDisplayIds[1] = t_wuqiData.displayID;
        var t_wingData = t_wing[locDisplayIds[2]];
        locCurDisplayIds[2] = t_wingData.displayID;
        otherDataList.push(locCurDisplayIds);

        allCombat+=locHero.combat;
    }

    var user = new UserEntity();
    user.id = uid;
    user.lvl = t_robotData.lvl;
    user.combat = allCombat;
    user.nickName = _getName(uid,t_robotData.sexArr[0]);

    robotObj.heroList = heroList;
    robotObj.otherDataList = otherDataList;
    robotObj.userData = user;
    return robotObj;
};

var _calProps = function(monsterId,heroTempId){
    var props = [];
    for(var i = 0;i<46+1;i++){
        props[i] = 0;
    }
    var t_monsterData = t_monster[monsterId];
    //生命	攻击	物防	魔防	命中	闪避	暴击	抗暴	增加伤害	减少伤害	麻痹	抗麻
    //maxHp:0,attack:0,defense:0,magicDefence:0,hit:0,dodge:0,critical:0,disCritical:0,damageIncrease:0,damageDecrease:0,benumbPro:0,disBenyumbPro:0
    props[1] = t_monsterData.maxHp;
    props[3] = t_monsterData.attack;
    props[5] = t_monsterData.defense;
    props[7] = t_monsterData.magicDefence;
    props[9] = t_monsterData.hit;
    props[11] = t_monsterData.dodge;
    props[13] = t_monsterData.critical;
    props[15] = t_monsterData.disCritical;
    props[23] = t_monsterData.damageIncrease;
    props[24] = t_monsterData.damageDecrease;
    props[25] = t_monsterData.benumbPro;
    props[26] = t_monsterData.disBenyumbPro;

    var t_heroData = t_hero[heroTempId];
    props[19] = t_heroData.moveSpeed;
    props[21] = t_heroData.attackInterval;
    return props;
};

/*

 var _getRandomName = function(sex,arr){
 var l = Object.keys(c_nameData).length;
 var firstName = c_nameData[commonUtils.getRandomNum(1,l)].firstName;
 var secondName = "";

 if(sex==0){
 secondName = c_nameData[commonUtils.getRandomNum(1,l)].maleName;
 }else{
 secondName = c_nameData[commonUtils.getRandomNum(1,l)].femaleName;
 }

 var name = firstName+secondName;
 if(arr.indexOf(name)>-1){
 return _getRandomName();
 }
 arr.push(name);
 return name;
 };

 var _createNameArr = function(sex,num){
 var arr = [];
 for(var i = 0;i<num;i++){
 _getRandomName(sex,arr);
 }
 return arr;
 };

 console.log(JSON.stringify(_createNameArr(0,200)) );
 */

/*
console.log(exports.getData(500));
 console.log(_getName(4,1));
console.log("啊飒飒的");
*/
