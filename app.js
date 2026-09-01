(function(){
  "use strict";

  // ---------- 한글 변환 테이블 ----------

  var GAN_KR = {"甲":"갑","乙":"을","丙":"병","丁":"정","戊":"무","己":"기","庚":"경","辛":"신","壬":"임","癸":"계"};
  var ZHI_KR = {"子":"자","丑":"축","寅":"인","卯":"묘","辰":"진","巳":"사","午":"오","未":"미","申":"신","酉":"유","戌":"술","亥":"해"};
  var WUXING_KR = {"木":"목","火":"화","土":"토","金":"금","水":"수"};
  var SIPSUNG_KR = {
    "比肩":"비견", "劫财":"겁재", "劫財":"겁재",
    "食神":"식신", "伤官":"상관", "傷官":"상관",
    "偏财":"편재", "偏財":"편재", "正财":"정재", "正財":"정재",
    "七杀":"편관", "七殺":"편관", "偏官":"편관", "正官":"정관",
    "偏印":"편인", "正印":"정인", "日主":"일주"
  };
  var GAN_WUXING = {"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
  var WUXING_ORDER = ["木","火","土","金","水"];
  var WUXING_COLOR = {"木":"var(--wood)","火":"var(--fire)","土":"var(--earth)","金":"var(--metal)","水":"var(--water)"};
  var GENERATES = {"木":"火","火":"土","土":"金","金":"水","水":"木"};
  var MONTH_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

  var GAN_HAP = [
    { a:"甲", b:"己", el:"土" },
    { a:"乙", b:"庚", el:"金" },
    { a:"丙", b:"辛", el:"水" },
    { a:"丁", b:"壬", el:"木" },
    { a:"戊", b:"癸", el:"火" }
  ];
  var SAMHAP = [
    { zhis:["申","子","辰"], wangji:"子", el:"水", name:"신자진" },
    { zhis:["亥","卯","未"], wangji:"卯", el:"木", name:"해묘미" },
    { zhis:["寅","午","戌"], wangji:"午", el:"火", name:"인오술" },
    { zhis:["巳","酉","丑"], wangji:"酉", el:"金", name:"사유축" }
  ];
  var YUKHAP = [
    { a:"子", b:"丑", el:"土" },
    { a:"寅", b:"亥", el:"木" },
    { a:"卯", b:"戌", el:"火" },
    { a:"辰", b:"酉", el:"金" },
    { a:"巳", b:"申", el:"水" },
    { a:"午", b:"未", el:"" }
  ];

  function ganzhiKr(gan, zhi){ return GAN_KR[gan] + ZHI_KR[zhi]; }
  function ganzhiKrFromStr(gz){ if(!gz) return ""; return ganzhiKr(gz.charAt(0), gz.charAt(1)); }
  function daysInMonth(y, m){ return new Date(y, m, 0).getDate(); }
  function pad2(n){ return (n<10?"0":"")+n; }

  // ---------- DOM refs ----------

  var form = document.getElementById("form");
  var resultEl = document.getElementById("result");
  var calTypeSeg = document.getElementById("calType");
  var genderSeg = document.getElementById("gender");
  var ziSectSeg = document.getElementById("ziSect");
  var leapField = document.getElementById("leapField");
  var timeUnknown = document.getElementById("timeUnknown");
  var timeInput = document.getElementById("time");
  var resetBtn = document.getElementById("resetBtn");
  var unseTabs = document.getElementById("unseTabs");
  var daewoonSelect = document.getElementById("daewoonSelect");
  var sewoonSelect = document.getElementById("sewoonSelect");
  var wolwoonSelect = document.getElementById("wolwoonSelect");

  var state = { calType: "solar", gender: "1", ziSect: "2" };

  var ZI_HELP = {
    "2": "밤 11시~12시(야자시)는 그날로, 밤 12시~새벽 1시(조자시·명자시)는 다음날로 계산합니다 — 오늘날 한국 만세력 대다수가 쓰는 방식입니다.",
    "1": "밤 11시부터 자시 전체(23:00~01:00)를 다음날로 계산합니다 — 야자시·조자시를 나누지 않는 일부 유파의 방식입니다."
  };

  function bindSegmented(container, key, onChange){
    container.addEventListener("click", function(e){
      var btn = e.target.closest(".seg-btn");
      if(!btn) return;
      Array.prototype.forEach.call(container.querySelectorAll(".seg-btn"), function(b){
        b.classList.toggle("is-active", b === btn);
      });
      state[key] = btn.getAttribute("data-val");
      if(onChange) onChange();
    });
  }
  bindSegmented(calTypeSeg, "calType", function(){
    leapField.hidden = (state.calType !== "lunar");
  });
  bindSegmented(genderSeg, "gender");
  bindSegmented(ziSectSeg, "ziSect", function(){
    document.getElementById("ziHelp").textContent = ZI_HELP[state.ziSect];
  });

  timeUnknown.addEventListener("change", function(){
    timeInput.disabled = timeUnknown.checked;
    if(timeUnknown.checked) timeInput.value = "";
  });

  resetBtn.addEventListener("click", function(){
    resultEl.hidden = true;
    form.hidden = false;
    window.scrollTo({top:0, behavior:"smooth"});
  });

  // ---------- 계산 시작 ----------

  form.addEventListener("submit", function(e){
    e.preventDefault();

    var name = document.getElementById("name").value.trim() || "이";
    var dateVal = document.getElementById("date").value;
    if(!dateVal){ return; }
    var parts = dateVal.split("-").map(Number);
    var y = parts[0], m = parts[1], d = parts[2];

    var hasTime = !timeUnknown.checked && !!timeInput.value;
    var hh = 12, mm = 0;
    if(hasTime){
      var tp = timeInput.value.split(":").map(Number);
      hh = tp[0]; mm = tp[1];
    }

    var lunar;
    try{
      if(state.calType === "solar"){
        lunar = Solar.fromYmdHms(y, m, d, hh, mm, 0).getLunar();
      } else {
        var isLeap = document.getElementById("leap").checked;
        lunar = window.Lunar.fromYmdHms(y, isLeap ? -m : m, d, hh, mm, 0);
      }
    } catch(err){
      alert("입력하신 날짜를 계산할 수 없어요. 날짜를 다시 확인해주세요.\n(" + err.message + ")");
      return;
    }

    render(name, lunar, hasTime, state.gender, Number(state.ziSect));
  });

  function render(name, lunar, hasTime, genderVal, sect){
    var bz = lunar.getEightChar();
    bz.setSect(sect);

    var pillarsData = [
      { key:"year",  label:"년주", gan: bz.getYearGan(),  zhi: bz.getYearZhi()  },
      { key:"month", label:"월주", gan: bz.getMonthGan(), zhi: bz.getMonthZhi() },
      { key:"day",   label:"일주", gan: bz.getDayGan(),   zhi: bz.getDayZhi()   },
      { key:"time",  label:"시주", gan: hasTime ? bz.getTimeGan() : "?", zhi: hasTime ? bz.getTimeZhi() : "?" }
    ];

    document.getElementById("resultName").textContent = name + " 님의 사주";
    document.getElementById("resultMeta").textContent =
      lunar.getSolar().toYmd() + " (음력 " + lunar.getYearInGanZhi() + "년 " + lunar.getMonthInChinese() + "월 " + lunar.getDayInChinese() + ")" +
      (hasTime ? "" : " · 시간 미상");

    renderPillars(pillarsData, hasTime);
    var wx = renderWuxing(pillarsData);
    renderSipsung(bz, pillarsData, hasTime);
    renderHap(pillarsData, hasTime);
    renderReading(bz, pillarsData, wx, hasTime);
    renderUnseFlow(bz, genderVal, hasTime);

    form.hidden = true;
    resultEl.hidden = false;
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function renderPillars(pillarsData, hasTime){
    var wrap = document.getElementById("pillars");
    wrap.innerHTML = "";
    pillarsData.forEach(function(p){
      var div = document.createElement("div");
      div.className = "pillar" + (p.key === "day" ? " is-day" : "");
      if(p.key === "time" && !hasTime){
        div.innerHTML =
          '<div class="pillar-label">' + p.label + '</div>' +
          '<div class="pillar-hanja">?</div>' +
          '<div class="pillar-reading">시간 미상</div>';
      } else {
        div.innerHTML =
          '<div class="pillar-label">' + p.label + (p.key==="day" ? " · 본인" : "") + '</div>' +
          '<div class="pillar-hanja">' + p.gan + '<br>' + p.zhi + '</div>' +
          '<div class="pillar-reading">' + ganzhiKr(p.gan, p.zhi) + '</div>';
      }
      wrap.appendChild(div);
    });
  }

  function renderWuxing(pillarsData){
    var score = {"木":0,"火":0,"土":0,"金":0,"水":0};
    pillarsData.forEach(function(p, idx){
      if(idx === 3 && p.gan === "?") return;
      score[GAN_WUXING[p.gan]] += 1;
      score[LunarUtil.WU_XING_ZHI[p.zhi]] += 1;
      var hides = LunarUtil.ZHI_HIDE_GAN[p.zhi] || [];
      hides.forEach(function(hg, i){
        score[GAN_WUXING[hg]] += (i === 0 ? 0.5 : 0.3);
      });
    });
    var total = WUXING_ORDER.reduce(function(s,k){ return s+score[k]; }, 0);

    var wrap = document.getElementById("wuxing");
    wrap.innerHTML = "";
    WUXING_ORDER.forEach(function(k){
      var pct = total ? Math.round(score[k]/total*100) : 0;
      var row = document.createElement("div");
      row.className = "wuxing-row";
      row.innerHTML =
        '<div class="wuxing-name" style="color:'+WUXING_COLOR[k]+'">' + WUXING_KR[k] + '</div>' +
        '<div class="wuxing-track"><div class="wuxing-fill" style="width:'+pct+'%;background:'+WUXING_COLOR[k]+'"></div></div>' +
        '<div class="wuxing-pct">' + pct + '%</div>';
      wrap.appendChild(row);
    });

    return { score: score, total: total };
  }

  function renderSipsung(bz, pillarsData, hasTime){
    var rows = [
      { label:"천간", get: function(key){
          if(key==="year") return bz.getYearShiShenGan();
          if(key==="month") return bz.getMonthShiShenGan();
          if(key==="day") return "일간(본인)";
          if(key==="time") return bz.getTimeShiShenGan();
        }},
      { label:"지지", get: function(key){
          if(key==="year") return bz.getYearShiShenZhi()[0];
          if(key==="month") return bz.getMonthShiShenZhi()[0];
          if(key==="day") return bz.getDayShiShenZhi()[0];
          if(key==="time") return bz.getTimeShiShenZhi()[0];
        }}
    ];

    var table = document.getElementById("sipsungTable");
    var head = "<tr><th></th>" + pillarsData.map(function(p){ return "<th>"+p.label+"</th>"; }).join("") + "</tr>";
    var body = rows.map(function(r){
      var cells = pillarsData.map(function(p){
        if(p.key === "time" && !hasTime) return "<td>—</td>";
        var v = r.get(p.key);
        var kr = SIPSUNG_KR[v] || v;
        return "<td>" + kr + "</td>";
      }).join("");
      return "<tr><th>" + r.label + "</th>" + cells + "</tr>";
    }).join("");
    table.innerHTML = head + body;
  }

  function renderHap(pillarsData, hasTime){
    var posLabel = { year:"년", month:"월", day:"일", time:"시" };
    var active = pillarsData.filter(function(p){ return hasTime || p.key !== "time"; });

    var gans = active.map(function(p){ return { label: posLabel[p.key]+"간", gan: p.gan }; });
    var zhis = active.map(function(p){ return { label: posLabel[p.key]+"지", zhi: p.zhi }; });

    // 천간합(간합)
    var ganHapList = [];
    for(var i=0;i<gans.length;i++){
      for(var j=i+1;j<gans.length;j++){
        GAN_HAP.forEach(function(h){
          var pair = [gans[i].gan, gans[j].gan];
          if((pair[0]===h.a && pair[1]===h.b) || (pair[0]===h.b && pair[1]===h.a)){
            ganHapList.push({
              chars: gans[i].gan+gans[j].gan,
              kr: GAN_KR[gans[i].gan]+GAN_KR[gans[j].gan],
              labels: gans[i].label+"·"+gans[j].label,
              el: h.el
            });
          }
        });
      }
    }

    // 삼합 / 반합
    var samhapList = [], banhapList = [];
    SAMHAP.forEach(function(set){
      var found = set.zhis.map(function(z){
        return zhis.filter(function(zp){ return zp.zhi === z; })[0] || null;
      });
      var presentCount = found.filter(function(f){ return f; }).length;
      if(presentCount === 3){
        samhapList.push({
          chars: found.map(function(f){return f.zhi;}).join(""),
          kr: found.map(function(f){return ZHI_KR[f.zhi];}).join(""),
          labels: found.map(function(f){return f.label;}).join("·"),
          el: set.el
        });
      } else if(presentCount === 2){
        var wangjiIdx = set.zhis.indexOf(set.wangji);
        if(found[wangjiIdx]){
          var pair = found.filter(function(f){ return f; });
          banhapList.push({
            chars: pair.map(function(f){return f.zhi;}).join(""),
            kr: pair.map(function(f){return ZHI_KR[f.zhi];}).join(""),
            labels: pair.map(function(f){return f.label;}).join("·"),
            el: set.el
          });
        }
      }
    });

    // 육합
    var yukhapList = [];
    for(var i2=0;i2<zhis.length;i2++){
      for(var j2=i2+1;j2<zhis.length;j2++){
        YUKHAP.forEach(function(h){
          var pair = [zhis[i2].zhi, zhis[j2].zhi];
          if((pair[0]===h.a && pair[1]===h.b) || (pair[0]===h.b && pair[1]===h.a)){
            yukhapList.push({
              chars: zhis[i2].zhi+zhis[j2].zhi,
              kr: ZHI_KR[zhis[i2].zhi]+ZHI_KR[zhis[j2].zhi],
              labels: zhis[i2].label+"·"+zhis[j2].label,
              el: h.el
            });
          }
        });
      }
    }

    function groupHtml(title, items, kind){
      if(items.length === 0) return "";
      var rows = items.map(function(it){
        var desc;
        if(kind === "gan") desc = "천간합 · " + it.labels + " 이(가) 합해 <b>" + WUXING_KR[it.el] + "</b> 기운으로 바뀌려 합니다.";
        else if(kind === "sam") desc = "삼합 · " + it.labels + " 세 글자가 모여 <b>" + WUXING_KR[it.el] + "국(局)</b>을 이룹니다. 온전한 삼합이라 힘이 뚜렷해요.";
        else if(kind === "ban") desc = "반합 · " + it.labels + " 두 글자가 <b>" + WUXING_KR[it.el] + "</b> 기운 쪽으로 절반쯤 묶입니다.";
        else desc = it.el ? ("육합 · " + it.labels + " 이(가) 짝을 이뤄 <b>" + WUXING_KR[it.el] + "</b> 기운을 냅니다.") : ("육합 · " + it.labels + " 이(가) 짝을 이루지만 정해진 오행으로 바뀌진 않아요.");
        return '<div class="hap-item"><div class="hap-chars">' + it.chars + '</div><div class="hap-desc">' + desc + ' <span style="opacity:.7">('+it.kr+')</span></div></div>';
      }).join("");
      return '<div class="hap-group"><p class="hap-group-title">' + title + '</p>' + rows + '</div>';
    }

    var html =
      groupHtml("천간합(干合)", ganHapList, "gan") +
      groupHtml("삼합(三合)", samhapList, "sam") +
      groupHtml("반합(半合)", banhapList, "ban") +
      groupHtml("육합(六合)", yukhapList, "yuk");

    if(!html) html = '<p class="hap-empty">원국 여덟 글자 사이에 성립하는 합이 없습니다.</p>';

    document.getElementById("hapResult").innerHTML = html;
  }

  function renderReading(bz, pillarsData, wx, hasTime){
    var dayGan = pillarsData[2].gan;
    var dayEl = GAN_WUXING[dayGan];
    var generatorEl = null;
    Object.keys(GENERATES).forEach(function(k){ if(GENERATES[k] === dayEl) generatorEl = k; });

    var supportRatio = (wx.score[dayEl] + wx.score[generatorEl]) / (wx.total || 1);
    var strengthLine, strengthLabel;
    if(supportRatio < 0.32){
      strengthLabel = "신약(身弱)";
      strengthLine = "일간 " + GAN_KR[dayGan] + WUXING_KR[dayEl] + "를 도와주는 오행(" + WUXING_KR[dayEl] + "·" + WUXING_KR[generatorEl] + ")이 전체의 " + Math.round(supportRatio*100) + "% 정도로, 주변 오행에 비해 힘이 약한 신약 사주로 보여요.";
    } else if(supportRatio > 0.5){
      strengthLabel = "신강(身强)";
      strengthLine = "일간 " + GAN_KR[dayGan] + WUXING_KR[dayEl] + "를 도와주는 오행이 전체의 " + Math.round(supportRatio*100) + "%로 두터운 편이라, 스스로의 힘이 강한 신강 사주로 보여요.";
    } else {
      strengthLabel = "중화(中和)";
      strengthLine = "일간을 돕는 오행과 소모시키는 오행이 " + Math.round(supportRatio*100) + "% 안팎으로 비교적 균형 잡힌 사주예요.";
    }
    document.getElementById("strengthLine").textContent = strengthLine;

    var all = [];
    all.push(SIPSUNG_KR[bz.getYearShiShenGan()] || bz.getYearShiShenGan());
    all.push(SIPSUNG_KR[bz.getMonthShiShenGan()] || bz.getMonthShiShenGan());
    if(hasTime) all.push(SIPSUNG_KR[bz.getTimeShiShenGan()] || bz.getTimeShiShenGan());
    all.push(SIPSUNG_KR[bz.getYearShiShenZhi()[0]] || bz.getYearShiShenZhi()[0]);
    all.push(SIPSUNG_KR[bz.getMonthShiShenZhi()[0]] || bz.getMonthShiShenZhi()[0]);
    all.push(SIPSUNG_KR[bz.getDayShiShenZhi()[0]] || bz.getDayShiShenZhi()[0]);
    if(hasTime) all.push(SIPSUNG_KR[bz.getTimeShiShenZhi()[0]] || bz.getTimeShiShenZhi()[0]);

    function count(names){ return all.filter(function(x){ return names.indexOf(x) >= 0; }).length; }

    var bullets = [];
    var c;

    c = count(["식신","상관"]);
    if(c >= 2) bullets.push("식신·상관이 여럿 있어 아이디어를 구체적인 결과물로 만들어내는 힘이 좋은 편이에요. 새로운 걸 만들고 표현하는 일에서 에너지를 얻는 타입입니다.");
    else if(c === 1) bullets.push("식신 또는 상관이 하나 있어, 상황에 따라 표현력·기획력을 발휘하는 구간이 있습니다.");

    c = count(["편재","정재"]);
    if(c >= 3) bullets.push("재성이 세 개 이상으로 많은 편이에요. 돈이 될 기회 자체는 자주 오지만, " + (strengthLabel==="신약(身弱)" ? "일간이 약한 상태라 그걸 소화할 체력·판단 여력이 부족해지기 쉬우니 무리한 확장보다는 하나씩 지켜가는 방식이 유리해요." : "일간의 힘도 충분해 기회를 실제 성과로 잘 연결할 수 있는 편이에요."));
    else if(c >= 1) bullets.push("재성이 자리 잡고 있어 실용적인 결과·수치에 대한 감각이 있는 편입니다.");

    c = count(["정관","편관"]);
    if(c >= 2) bullets.push("관성이 여럿이라 규칙·책임 안에서 움직일 때 안정감을 느끼는 편이에요. 다만 너무 몰리면 부담이 커질 수 있어요.");

    c = count(["정인","편인"]);
    if(c >= 2) bullets.push("인성이 든든해서 배움과 직관을 통해 스스로를 채우는 힘이 좋은 편이에요.");
    else if(c === 1 && strengthLabel === "신약(身弱)") bullets.push("인성이 하나 있어 일간을 도와주긴 하지만, 혼자서는 다소 부족해 인성·비겁운이 들어오는 시기에 컨디션이 한결 나아지는 편이에요.");

    c = count(["비견","겁재"]);
    if(c >= 2) bullets.push("비겁이 뚜렷해서 협업하는 동료나 함께 일할 사람이 있을 때 힘을 더 잘 쓰는 편이에요.");

    if(bullets.length === 0) bullets.push("특정 오행이나 십성으로 크게 치우치지 않고 비교적 고르게 분포된 사주예요.");

    var list = document.getElementById("readingList");
    list.innerHTML = bullets.map(function(b){ return "<li>" + b + "</li>"; }).join("");
  }

  // ---------- 운세 흐름: 대운 → 세운 → 월운 → 일운 ----------

  var flow = { yun:null, daYunList:null, currentDaYun:null, currentYear:null, currentYM:null };

  function renderUnseFlow(bz, genderVal, hasTime){
    var yun = bz.getYun(Number(genderVal));
    flow.yun = yun;
    flow.daYunList = yun.getDaYun().filter(function(dy){ return dy.getIndex() >= 1; });

    document.getElementById("daewoonMeta").textContent =
      (yun.isForward() ? "순행(順行)" : "역행(逆行)") + " · 대운수 약 " + yun.getStartYear() + "년 " + yun.getStartMonth() + "개월" +
      (hasTime ? "" : " (시간 미상이라 참고값)");

    var today = new Date();
    var nowYear = today.getFullYear();

    var currentDaYun = flow.daYunList.filter(function(dy){
      return nowYear >= dy.getStartYear() && nowYear <= dy.getEndYear();
    })[0] || flow.daYunList[0];
    flow.currentDaYun = currentDaYun;

    renderDaewoonTable();
    fillDaewoonSelect();
    daewoonSelect.value = String(currentDaYun.getIndex());
    renderSewoonTable(currentDaYun);

    flow.currentYear = nowYear;
    renderWolwoonTable(flow.currentYear);

    flow.currentYM = { y: nowYear, m: today.getMonth()+1 };
    renderIlwoonTable(flow.currentYM.y, flow.currentYM.m);

    setupTabs();
  }

  function renderDaewoonTable(){
    var table = document.getElementById("daewoonTable");
    var nowYear = new Date().getFullYear();
    var rows = flow.daYunList.slice(0, 8).map(function(dy){
      var gz = dy.getGanZhi();
      var isCurrent = nowYear >= dy.getStartYear() && nowYear <= dy.getEndYear();
      return "<tr class=\"" + (isCurrent?"is-current":"") + "\" data-clickable data-index=\"" + dy.getIndex() + "\">" +
        "<td>" + dy.getStartYear() + "~" + dy.getEndYear() + "</td>" +
        "<td class=\"hanja-cell\">" + gz + "</td>" +
        "<td>" + ganzhiKrFromStr(gz) + "</td>" +
        "<td>" + dy.getStartAge() + "세~</td>" +
        "</tr>";
    }).join("");
    table.innerHTML = "<tr><th>기간</th><th>간지</th><th>한글</th><th>나이</th></tr>" + rows;

    table.onclick = function(e){
      var tr = e.target.closest("tr[data-clickable]");
      if(!tr) return;
      var idx = Number(tr.getAttribute("data-index"));
      var dy = flow.daYunList.filter(function(d){ return d.getIndex() === idx; })[0];
      if(!dy) return;
      daewoonSelect.value = String(idx);
      renderSewoonTable(dy);
      switchTab("sewoon");
    };
  }

  function fillDaewoonSelect(){
    daewoonSelect.innerHTML = flow.daYunList.slice(0,8).map(function(dy){
      return '<option value="'+dy.getIndex()+'">'+dy.getStartYear()+'~'+dy.getEndYear()+'년 ('+dy.getGanZhi()+' '+ganzhiKrFromStr(dy.getGanZhi())+')</option>';
    }).join("");
    daewoonSelect.onchange = function(){
      var dy = flow.daYunList.filter(function(d){ return d.getIndex() === Number(daewoonSelect.value); })[0];
      if(dy) renderSewoonTable(dy);
    };
  }

  function renderSewoonTable(daYun){
    flow.currentDaYun = daYun;
    var table = document.getElementById("sewoonTable");
    var nowYear = new Date().getFullYear();
    var liuNianList = daYun.getLiuNian(10);
    var rows = liuNianList.map(function(ln){
      var gz = ln.getGanZhi();
      var isCurrent = ln.getYear() === nowYear;
      return "<tr class=\"" + (isCurrent?"is-current":"") + "\" data-clickable data-year=\"" + ln.getYear() + "\">" +
        "<td>" + ln.getYear() + "년</td>" +
        "<td class=\"hanja-cell\">" + gz + "</td>" +
        "<td>" + ganzhiKrFromStr(gz) + "</td>" +
        "<td>" + ln.getAge() + "세</td>" +
        "</tr>";
    }).join("");
    table.innerHTML = "<tr><th>연도</th><th>간지</th><th>한글</th><th>나이</th></tr>" + rows;

    fillSewoonSelect(liuNianList, nowYear);

    table.onclick = function(e){
      var tr = e.target.closest("tr[data-clickable]");
      if(!tr) return;
      var year = Number(tr.getAttribute("data-year"));
      sewoonSelect.value = String(year);
      flow.currentYear = year;
      renderWolwoonTable(year);
      switchTab("wolwoon");
    };
  }

  function fillSewoonSelect(liuNianList, nowYear){
    sewoonSelect.innerHTML = liuNianList.map(function(ln){
      return '<option value="'+ln.getYear()+'">'+ln.getYear()+'년 ('+ln.getGanZhi()+' '+ganzhiKrFromStr(ln.getGanZhi())+')</option>';
    }).join("");
    var hasNow = liuNianList.some(function(ln){ return ln.getYear() === nowYear; });
    sewoonSelect.value = String(hasNow ? nowYear : liuNianList[0].getYear());
    sewoonSelect.onchange = function(){
      var year = Number(sewoonSelect.value);
      flow.currentYear = year;
      renderWolwoonTable(year);
    };
  }

  function renderWolwoonTable(year){
    flow.currentYear = year;
    var table = document.getElementById("wolwoonTable");
    var today = new Date();
    var rows = "";
    for(var m=1; m<=12; m++){
      var gz = Solar.fromYmd(year, m, 15).getLunar().getMonthInGanZhi();
      var isCurrent = (year === today.getFullYear() && m === today.getMonth()+1);
      rows += "<tr class=\"" + (isCurrent?"is-current":"") + "\" data-clickable data-month=\"" + m + "\">" +
        "<td>" + MONTH_KR[m-1] + "</td>" +
        "<td class=\"hanja-cell\">" + gz + "</td>" +
        "<td>" + ganzhiKrFromStr(gz) + "</td>" +
        "</tr>";
    }
    table.innerHTML = "<tr><th>월</th><th>간지</th><th>한글</th></tr>" + rows;

    fillWolwoonSelect(year, today);

    table.onclick = function(e){
      var tr = e.target.closest("tr[data-clickable]");
      if(!tr) return;
      var m = Number(tr.getAttribute("data-month"));
      wolwoonSelect.value = String(m);
      flow.currentYM = { y: year, m: m };
      renderIlwoonTable(year, m);
      switchTab("ilwoon");
    };
  }

  function fillWolwoonSelect(year, today){
    wolwoonSelect.innerHTML = MONTH_KR.map(function(label, i){
      return '<option value="'+(i+1)+'">'+label+'</option>';
    }).join("");
    var defaultM = (year === today.getFullYear()) ? (today.getMonth()+1) : 1;
    wolwoonSelect.value = String(defaultM);
    wolwoonSelect.onchange = function(){
      var m = Number(wolwoonSelect.value);
      flow.currentYM = { y: year, m: m };
      renderIlwoonTable(year, m);
    };
  }

  function renderIlwoonTable(year, month){
    var table = document.getElementById("ilwoonTable");
    var n = daysInMonth(year, month);
    var today = new Date();
    var rows = "";
    for(var d=1; d<=n; d++){
      var gz = Solar.fromYmd(year, month, d).getLunar().getDayInGanZhi();
      var isToday = (year===today.getFullYear() && month===today.getMonth()+1 && d===today.getDate());
      rows += "<tr class=\"" + (isToday?"is-today":"") + "\">" +
        "<td>" + year + "-" + pad2(month) + "-" + pad2(d) + (isToday?" (오늘)":"") + "</td>" +
        "<td class=\"hanja-cell\">" + gz + "</td>" +
        "<td>" + ganzhiKrFromStr(gz) + "</td>" +
        "</tr>";
    }
    table.innerHTML = "<tr><th>날짜</th><th>간지</th><th>한글</th></tr>" + rows;
  }

  function switchTab(name){
    Array.prototype.forEach.call(unseTabs.querySelectorAll(".seg-btn"), function(b){
      b.classList.toggle("is-active", b.getAttribute("data-val") === name);
    });
    ["daewoon","sewoon","wolwoon","ilwoon"].forEach(function(k){
      document.getElementById("pane-"+k).hidden = (k !== name);
    });
  }

  var tabsBound = false;
  function setupTabs(){
    if(tabsBound) return;
    tabsBound = true;
    unseTabs.addEventListener("click", function(e){
      var btn = e.target.closest(".seg-btn");
      if(!btn) return;
      switchTab(btn.getAttribute("data-val"));
    });
  }

  // ---------- PWA: 서비스워커 등록 ----------
  if("serviceWorker" in navigator){
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("sw.js").catch(function(){});
    });
  }

})();
