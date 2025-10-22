<script setup lang="ts">
    import { ref } from 'vue';
    import { useOptionsStore } from '../../stores/options';

    const optionsStore = useOptionsStore();

    /**
     * 切割长文本执行函数，由sliceLongText调用，是sliceLongText的子函数
     * @param {String} content 文本内容，非完整内容，按级别分隔好的内容
     * @param {Number} nowLength 当前长度，用于递归时计算文本长度
     * @param {Number} maxLength 允许的最大长度
     * @param {Number} allowLevel 当前的级别 
     * @param {Number} maxAllowLevel 最大级别 1级按换行切割 2级按句号分句 3级按逗号分词
     * @returns {Object<{content, index}>} content 分隔好的字符串，index 当前分割的字符数
     */
    const sliceStrByLength = (content, nowLength, maxLength, allowLevel, maxAllowLevel)=>{
        // 分隔内容
        let contentArray = [];
        switch(allowLevel){
            case 1: 
                // 1级按换行分隔
                contentArray = content.split(/[\n\r\n]/);
                break;
            case 2:
                // 2级按句号、感叹号、问号等分句
                contentArray = content.split(/[。！？\.!\?]/);
                break;
            case 3:
                // 3级按逗号、顿号、冒号、引号分词
                contentArray = content.split(/[，\,：\:“‘\"\']/);
                break;
            default: 
                throw Error("切割长文本失败：未知级别 " + allowLevel);
        }

        let resultStr = "";
        let resultIndex = 0;
        for(let i = 0; i < contentArray.length; i++){
            const item = contentArray[i];
            // 判断是否到达限制了
            if((item + resultStr).length + nowLength > maxLength){
                // 如果达到限制，判断第字符串是否为空
                if(resultStr == ""){
                    // 如果字符串为空，代表第1项就超出了预期长度，判断是否允许往下细分
                    if(allowLevel + 1 > maxAllowLevel){
                        // 不允许往下细分了，冒险添加
                        resultStr += item;
                        resultIndex += item.length + 1;
                        resultStr += content.slice(resultIndex - 1 , resultIndex);
                    }else{
                        // 允许往下细分
                        const tempData = sliceStrByLength(item, resultIndex + nowLength, maxLength, allowLevel + 1, maxAllowLevel);
                        resultStr += tempData.content;
                        resultIndex += tempData.index;
                    }
                    // 不管是否允许往下细分，当前这句话必须会达到限制，所以执行完后退出
                    break;
                }else{
                    // 字符串不为空，则退出循环
                    break;
                }
            }else{
                // 如果没达到则添加字符串
                resultStr += item;
                resultIndex += item.length + 1;
                resultStr += content.slice(resultIndex - 1 , resultIndex);
            }
        }

        return {
            content: resultStr,
            index: resultIndex
        }
    }

    /**
     * 切割长文本，根据标点符号的划分，最终文本长度可能会有偏差
     * @param {String} content 完整的文本数据
     * @param {Number} maxLength 允许的最大长度
     * @param {Number} maxAllowLevel 最大级别 1级按换行切割 2级按句号分句 3级按逗号分词
     * @returns {Array} 切割好的文本数组
     */
    const sliceLongText = (content, maxLength, maxAllowLevel) => {
        let index = 0;
        const result = [];
        while(content.slice(index) != ''){
            const data = sliceStrByLength(content.slice(index), 0, maxLength, 1, maxAllowLevel);
            result.push(data.content);
            index += data.index;
        }

        return result;
    }

    /**
     * 输入提示词和文字内容，返回AI输出
     * @param {String} prompt 发送给AI的提示词
     * @param {String} content 对应的内容
     * @returns {Promise<String>} AI返回的内容
     */
    const run = async (prompt, content)=>{
        // 是否使用半自动模式
        let manualAuto = false;

        // 获取设置中的AI平台、密钥等数据
        let tempData = optionsStore.getOptionByKey("selectedAiPlatform");
        let aiOptions = {
            aiPlatform: '',
            model: '',
            proxy: '',
            apiKey: ''
        }

        if(tempData.index != -1){
            aiOptions.aiPlatform = tempData.data.val;
        }

        // 如果没有AI平台，代表用户没有在设置中选择AI和填写信息，强制使用半自动模式
        if(aiOptions.aiPlatform == ""){
            manualAuto = true;
        }

        // 当有AI模型时，才去获取API密钥及代理信息
        if(!manualAuto){
            tempData = optionsStore.getOptionByKey(aiOptions.aiPlatform + "_Option");
            if(tempData.index != -1){
                // 如果找到了模型信息
                const data = JSON.parse(tempData.data.val);
                aiOptions.model = data.model;
                aiOptions.apiKey = data.apiKey;
                aiOptions.proxy = data.proxy;
            }else{
                // 没有找到模型信息，强制使用半自动模式
                manualAuto = true;
            }
        }

        sliceLongText(`各位,再次非常感谢相泽南获2019 FANZA成人奖最佳女优奖。
相泽南的灰姑娘故事
我想让更多人了解她,所以尽我笨拙的文采,记录她从无到有成为日本第一的故事。
如果您有兴趣,请阅读。谢谢!
(以下是详细内容)
2014年的夏天,我发掘了一位18岁的少女,就是后来的相泽南。我在熟悉的咖啡店邀请她,我们畅所欲言,度过了开心的时光。她是一个阳光开朗,饭量很好的女孩(笑)。那时,她是一个女大学生,做着杂志模特和社团活动。她很喜欢和比她大14岁的我在一起。最初,她对拍AV这样的事完全没有兴趣,几乎没有与男性的经验,是一个单纯朴实、不谙世事的女孩(现在还是不谙世事吧,哈哈)。大家都知道,她上的是一所知名的名门女子大学。我当时并不知道(笑)。
由于各种原因,我们有一段时间见不到面,再见到她时,她已经19岁了。再会的喜悦让她在吃韩国料理时哭了出来。从那时起,她就变得爱哭(笑)。就在那一年的师走,我邀请她“要不去Idea Pocket玩玩?”,于是她决定去AV公司看看。在去的路上,她跟我说“我要拍AV了”......当天我们只是和制作人喝了茶,然后约在2月再面谈。两个月后,她的想法没有改变。AV公司非常欢迎她,给了她很好的条件签约。3月,拍摄了处女作。事后我跑过去看她,她在哭。采访时她说是因为紧张,但我知道那是因为第一次和不喜欢的男人发生关系的震惊所致。为期两天的拍摄每天准时在9点结束,因为那时她还和家人住在一起,有门禁。我每次都在11点前送她回家。 
她的首部作品是在当时人气很高的“AV Open 2016”中面世的。她是个精英。拍摄限到9点结束,性行为也有很多限制。甚至在作品发布前,公司就以更好的条件和她续约了,这在业内是非常罕见的。但结果却是销量不佳。当然,公司将条件降低了,即使如此,她还是死死抓住Idea Pocket不放。在几次续约后,最终还是合同期满。即便如此,她也没有打算单干,也没有考虑转移到其他公司。她的首次见面会仅有40人参加,我们两人都担心暴露真实身份,为了防止曝光,选择了一个狭小的酒吧开会,尽量避免媒体曝光。这成了她没有红起来的原因。她的Twitter关注者也比同期的少。然而,通过她朋友的告密,她的家人突然得知了真相。5个月后,Idea Pocket终于允许她再次拍摄。公司并没有抛弃相泽南,我为此真的很感激。于是,我和她开始认真思考,我们必须改变之前的做法。她开始更积极地接触媒体。即使没有片酬,她也不计较去出演。我认为她最大的武器是真诚。她没有伪装,真心喜欢粉丝。见面会时,她会认真地跟粉丝互动。她为此由衷地开心。她自己做点心,设计卡片,添加见面会特典。我们也经常举办见面会。她每天至少要发一条推特,并接受我从男性角度提出的建议,比如改变头像等,她都会乖乖照做。在性行为上,她也努力尝试了之前一直避免的事情,如颜射、风格等。AV之外的工作邀约也越来越多。
顺便提一下,她没有太多杂志写真。这既是因为场地太小的原因,也是因为当时我们去杂志社做宣传时,他们都不知道相泽南,说她太不起眼、太年轻等而拒绝。在所有杂志社中,只有一家愿意为她拍摄,我们都不会忘记他们的恩情。即使其他杂志现在提出合作,相泽南也决定不接,这就是她至今没有写真集的原因。如果将来要出写真集,也一定是由对我们有恩的那家杂志社来制作。我经常告诉她,恩情不能忘。粉丝中也有从首次见面会和见面会开始就一直支持她的。现在开见面会立刻会销售一空,我明白这点,但我认为相泽南的根基在于最初的那批粉丝。我不想歧视任何一位粉丝,能被他们亲切地称为“社长”,我感到很高兴。但人毕竟会对在困难和痛苦时伸出援手的人格外感激。我也不例外。现在她红遍各大AV公司,人气高涨,但我和她都不会忘记最初的根基。所以,无论多红,我们都不会忘形,会继续做出待应援、跟粉丝互动等。
她以精英之姿出道,但曾历经颠簸,所以这是从悬崖边爬上来的成功。公司也很新,粉丝需要靠她自己一点一点聚集。之前的见面会门票并不像现在那么抢手,那也是通过她的努力才让它们常常销售一空的。去年7月,我因急性白血病急症入院,没有经纪人的时候,她会一个人乘坐电车和出租车去工作。她甚至会考虑车费问题。我感到非常内疚,因为她终于有了起色。她现场感很好,无论在哪个工作环境都很受欢迎,所以工作不断。我住院的第7个月,她收到了FANZA成人奖的提名。我们两人在电话里痛哭。然后AV公司再次和她续约,提出的条件非常优厚,而且由于作品销量好,还有额外奖金。我们感到非常开心。这正是对相泽南的认可。在成人奖评选期间,由于是首次,我们都不清楚该怎么争取票数。而我自己也因为病情再次住院,能做的事很有限。我感到焦虑。竞争对手在拼命争取选票。就在这个时刻,同行们给了我帮助。要在选举中获胜,需要花钱。但每个人都自发无偿地帮忙。我在1000多个LINE好友里发出了号召。他们中的支持者又向自己的好友发出了号召。然后奇迹发生了。原来相泽南很有人气。各行各业的人都在支持她,连演艺圈的也有。大量的朋友为她投票。她最初只是被提名,就已感到非常满意,但我认为如果赢不了最好一开始就不要参加。我设定的是必胜目标。想要获胜的不只我一个人,而且之前获得过这个奖项的某人(不点名)是认真的,所以我们这边也很认真。说实话,我最在意的就是她。关于竞选手段,我认为只要不违规都可以。这也是一种实力。比如在见面会上给投票的人特典,在正常的选举中这是违法的(笑)。即使只发放纸巾也是一个了不起的主意,是很大的威胁。相泽南在业内也越来越受欢迎,女优同行也给予支持,工作人员和店家们也帮了忙。我认为获胜的原因在于她受各界人士的爱戴。当然,运气也占了一定份额。颁奖典礼当天,她得到了来自各界的应援,她的朋友也带领几十人来投票、加油。当然还有我们Miyano家的所有成员。其实我是在二楼看的,她是从舞台上看到我们Miyano家的声援特别大。听到这样热烈的应援,她感觉自己会赢。当宣布她的名字时,我也哭了。不,在宣布之前我就已经流下了眼泪。光是看到我们家的应援我就忍不住哭了。之后在出待时,Tさん也泣不成声,太卑鄙了(笑),又让我感动哭了。我们家的力量是伟大的。感谢所有人真挚而精彩的支持与鼓舞。
相泽南的灰姑娘故事仍在继续。她从一名精英出道,尝到失败的痛苦,现在是时候再次闪耀了吧?竞争对手从出道起就是光芒四射。相泽南在污泥中摸爬滚打,经历过饥饿的日子。希望她能长久地闪耀下去。作为日本第一,她肩负重任。希望大家今后也能对成为日本第一的相泽南提供支持。非常感谢!
        `, 50, 3);

        return aiOptions;
    }

    defineExpose({
        run
    });
</script>

<template>
    
</template>

<style scoped>
    
</style>