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
  var CHUNG = [["子","午"],["丑","未"],["寅","申"],["卯","酉"],["辰","戌"],["巳","亥"]];
  var PA = [["子","酉"],["丑","辰"],["寅","亥"],["卯","午"],["申","巳"],["戌","未"]];
  var HAE = [["子","未"],["丑","午"],["寅","巳"],["卯","辰"],["申","亥"],["酉","戌"]];
  var XING = [["寅","巳","申"],["丑","戌","未"],["子","卯"],["辰","辰"],["午","午"],["酉","酉"],["亥","亥"]];

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
  var solarDateField = document.getElementById("solarDateField");
  var lunarDateField = document.getElementById("lunarDateField");
  var dateInput = document.getElementById("date");
  var lunarYearSel = document.getElementById("lunarYear");
  var lunarMonthSel = document.getElementById("lunarMonth");
  var lunarDaySel = document.getElementById("lunarDay");
  var lunarPreview = document.getElementById("lunarPreview");
  var formError = document.getElementById("formError");
  var timeUnknown = document.getElementById("timeUnknown");
  var timeInput = document.getElementById("time");
  var resetBtn = document.getElementById("resetBtn");
  var unseTabs = document.getElementById("unseTabs");
  var daewoonSelect = document.getElementById("daewoonSelect");
  var sewoonSelect = document.getElementById("sewoonSelect");
  var wolwoonSelect = document.getElementById("wolwoonSelect");

  var state = { calType: "solar", gender: "1", ziSect: "2" };
  var flow = {};

  var ZI_HELP = {
    "2": "밤 11시~12시(야자시)는 그날로, 밤 12시~새벽 1시(조자시·명자시)는 다음날로 계산합니다 — 오늘날 한국 만세력 대다수가 쓰는 방식입니다.",
    "1": "밤 11시부터 자시 전체(23:00~01:00)를 다음날로 계산합니다 — 야자시·조자시를 나누지 않는 일부 유파의 방식입니다."
  };

  function bindSegmented(container, key, onChange){
    Array.prototype.forEach.call(container.querySelectorAll(".seg-btn"), function(b){
      b.setAttribute("aria-pressed", b.classList.contains("is-active") ? "true" : "false");
    });
    container.addEventListener("click", function(e){
      var btn = e.target.closest(".seg-btn");
      if(!btn) return;
      Array.prototype.forEach.call(container.querySelectorAll(".seg-btn"), function(b){
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      state[key] = btn.getAttribute("data-val");
      if(onChange) onChange();
    });
  }
  bindSegmented(calTypeSeg, "calType", function(){
    var isLunar = (state.calType === "lunar");
    solarDateField.hidden = isLunar;
    lunarDateField.hidden = !isLunar;
    if(isLunar) initLunarSelects();
    clearError();
  });
  bindSegmented(genderSeg, "gender");
  bindSegmented(ziSectSeg, "ziSect", function(){
    document.getElementById("ziHelp").textContent = ZI_HELP[state.ziSect];
  });

  function clearError(){
    formError.hidden = true;
    formError.textContent = "";
  }
  function showError(msg){
    formError.textContent = msg;
    formError.hidden = false;
    formError.scrollIntoView({block:"center", behavior:"smooth"});
  }

  // ---------- 음력 생년월일 선택(유효한 날짜만 고를 수 있도록 연/월/일 select 구성) ----------

  var lunarSelectsReady = false;

  function initLunarSelects(){
    if(lunarSelectsReady) return;
    lunarSelectsReady = true;

    var thisYear = new Date().getFullYear();
    var minYear = 1900, maxYear = 2035;
    var opts = "";
    for(var y = maxYear; y >= minYear; y--){
      opts += '<option value="'+y+'">'+y+'년</option>';
    }
    lunarYearSel.innerHTML = opts;
    lunarYearSel.value = String(Math.min(Math.max(thisYear - 30, minYear), maxYear));

    buildLunarMonthOptions();
    buildLunarDayOptions();
    updateLunarPreview();

    lunarYearSel.addEventListener("change", function(){
      buildLunarMonthOptions();
      buildLunarDayOptions();
      updateLunarPreview();
    });
    lunarMonthSel.addEventListener("change", function(){
      buildLunarDayOptions();
      updateLunarPreview();
    });
    lunarDaySel.addEventListener("change", updateLunarPreview);
  }

  function buildLunarMonthOptions(){
    var year = Number(lunarYearSel.value);
    var prevValue = lunarMonthSel.value;
    var leapMonth = 0;
    try{ leapMonth = window.LunarYear.fromYear(year).getLeapMonth(); } catch(err){ leapMonth = 0; }

    var opts = "";
    for(var m = 1; m <= 12; m++){
      opts += '<option value="'+m+'">'+m+'월</option>';
      if(leapMonth === m){
        opts += '<option value="'+(-m)+'">윤'+m+'월</option>';
      }
    }
    lunarMonthSel.innerHTML = opts;
    if(prevValue && lunarMonthSel.querySelector('option[value="'+prevValue+'"]')){
      lunarMonthSel.value = prevValue;
    }
  }

  function buildLunarDayOptions(){
    var year = Number(lunarYearSel.value);
    var month = Number(lunarMonthSel.value);
    var prevValue = lunarDaySel.value;
    var dayCount = 30;
    try{ dayCount = window.LunarMonth.fromYm(year, month).getDayCount(); } catch(err){ dayCount = 30; }

    var opts = "";
    for(var d = 1; d <= dayCount; d++){
      opts += '<option value="'+d+'">'+d+'일</option>';
    }
    lunarDaySel.innerHTML = opts;
    if(prevValue && Number(prevValue) <= dayCount){
      lunarDaySel.value = prevValue;
    }
  }

  function updateLunarPreview(){
    var year = Number(lunarYearSel.value);
    var month = Number(lunarMonthSel.value);
    var day = Number(lunarDaySel.value);
    var isLeap = month < 0;
    lunarPreview.textContent =
      "선택한 음력 날짜: " + year + "년 " + (isLeap ? "윤" : "") + Math.abs(month) + "월 " + day + "일";
  }

  timeUnknown.addEventListener("change", function(){
    timeInput.disabled = timeUnknown.checked;
    if(timeUnknown.checked) timeInput.value = "";
  });

  resetBtn.addEventListener("click", function(){
    clearError();
    resultEl.hidden = true;
    form.hidden = false;
    window.scrollTo({top:0, behavior:"smooth"});
  });

  // ---------- 계산 시작 ----------

  form.addEventListener("submit", function(e){
    e.preventDefault();
    clearError();

    var name = document.getElementById("name").value.trim();

    var hasTime = !timeUnknown.checked && !!timeInput.value;
    var hh = 12, mm = 0;
    if(hasTime){
      var tp = timeInput.value.split(":").map(Number);
      hh = tp[0]; mm = tp[1];
    }

    var lunar;
    try{
      if(state.calType === "solar"){
        var dateVal = dateInput.value;
        if(!dateVal){ showError("생년월일을 입력해주세요."); dateInput.focus(); return; }
        var parts = dateVal.split("-").map(Number);
        lunar = Solar.fromYmdHms(parts[0], parts[1], parts[2], hh, mm, 0).getLunar();
      } else {
        initLunarSelects();
        var y = Number(lunarYearSel.value), m = Number(lunarMonthSel.value), d = Number(lunarDaySel.value);
        lunar = window.Lunar.fromYmdHms(y, m, d, hh, mm, 0);
      }
    } catch(err){
      showError("입력하신 날짜를 계산할 수 없어요. 날짜를 다시 확인해주세요. (" + err.message + ")");
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

    document.getElementById("resultName").textContent = name ? (name + " 님의 사주") : "사주 결과";
    document.getElementById("resultMeta").textContent =
      lunar.getSolar().toYmd() + " (음력 " + lunar.getYearInGanZhi() + "년 " + lunar.getMonthInChinese() + "월 " + lunar.getDayInChinese() + ")" +
      (hasTime ? "" : " · 시간 미상");

    renderPillars(pillarsData, hasTime);
    var wx = renderWuxing(pillarsData);
    renderSipsung(bz, pillarsData, hasTime);
    renderCoreAnalysis(bz, pillarsData, wx, hasTime);
    renderDetailTable(bz, pillarsData, hasTime);
    renderRelations(pillarsData, hasTime);
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


  // ---------- 명리 핵심 분석 ----------
	function calcStrength(bz, pillarsData, hasTime){
	  var dayGan = pillarsData[2].gan, dayEl = GAN_WUXING[dayGan];
	  var resourceEl = Object.keys(GENERATES).filter(function(k){return GENERATES[k]===dayEl;})[0];
	  var sameEl = dayEl;
	  
	  var support = 0, total = 0;
	  var detail = { month: 0, day: 0, hour: 0, year: 0, ganSupport: 0, zhiSupport: 0, hideSupport: 0 };
	  
	  pillarsData.forEach(function(p, i){
		if(p.gan === "?") return;
		
		// 천간 가중치: 월간 1.5, 일간(본인) 제외, 년간/시간 1.0
		var ganW = (i === 1 ? 1.5 : (i === 2 ? 0 : 1.0));
		if(i !== 2){ // 일간 자신은 제외
		  total += ganW;
		  if(GAN_WUXING[p.gan] === sameEl || GAN_WUXING[p.gan] === resourceEl){
			support += ganW;
			detail.ganSupport += ganW;
		  }
		}
		
		// 지지 가중치: 월지 3.0, 일지 2.0, 시지 1.5, 년지 1.0
		if(p.zhi && p.zhi !== "?"){
		  var zhiW = (i === 1 ? 3.0 : (i === 2 ? 2.0 : (i === 3 ? 1.5 : 1.0)));
		  total += zhiW;
		  if(LunarUtil.WU_XING_ZHI[p.zhi] === sameEl || LunarUtil.WU_XING_ZHI[p.zhi] === resourceEl){
			support += zhiW;
			detail.zhiSupport += zhiW;
		  }
		  
		  // 지장간: 본기 0.7, 중기 0.4, 여기 0.2
		  var hides = LunarUtil.ZHI_HIDE_GAN[p.zhi] || [];
		  var hideWeights = [0.7, 0.4, 0.2];
		  hides.forEach(function(hg, n){
			var hw = hideWeights[n] || 0.1;
			total += hw;
			if(GAN_WUXING[hg] === sameEl || GAN_WUXING[hg] === resourceEl){
			  support += hw;
			  detail.hideSupport += hw;
			}
		  });
		}
		
		if(i === 1) detail.month = support; // 월령 기여도
	  });
	  
	  var ratio = total ? support / total : 0.5;
	  
	  // 월령 득실 판정 (월지가 일간을 생조하는가)
	  var monthEl = LunarUtil.WU_XING_ZHI[pillarsData[1].zhi];
	  var deukRyeong = (monthEl === sameEl || monthEl === resourceEl);
	  
	  var label;
	  if(ratio < 0.35) label = "신약(身弱)";
	  else if(ratio > 0.65) label = "신강(身强)";
	  else label = "중화(中和)";
	  
	  return { 
		ratio: ratio, 
		label: label, 
		deukRyeong: deukRyeong,
		support: support,
		total: total,
		detail: detail
	  };
	}

	function renderCoreAnalysis(bz, pillarsData, wx, hasTime){
	  var st = calcStrength(bz, pillarsData, hasTime);
	  var dayGan = pillarsData[2].gan;
	  var dayEl = GAN_WUXING[dayGan];
	  var resourceEl = Object.keys(GENERATES).filter(function(k){return GENERATES[k]===dayEl;})[0];
	  var outputEl = GENERATES[dayEl];        // 일간이 생하는 오행 (식상)
	  var wealthEl = GENERATES[outputEl];      // 일간이 극하는 오행 (재성)
	  var controllerEl = null;                 // 일간을 극하는 오행 (관성)
	  var controlledEl = null;                 // 일간을 생하는 오행의... (인성)
	  
	  // 일간을 극하는 오행 찾기: X → dayEl인 X
	  Object.keys(GENERATES).forEach(function(k){
		if(GENERATES[k] === dayEl) resourceEl = k;   // 인성
		if(GENERATES[dayEl] === k) outputEl = k;     // 식상
	  });
	  // 일간이 극하는 오행: dayEl → Y
	  Object.keys(GENERATES).forEach(function(k){
		if(GENERATES[dayEl] === k) outputEl = k;
	  });
	  wealthEl = GENERATES[outputEl];
	  // 일간을 극하는 오행: Z → dayEl
	  Object.keys(GENERATES).forEach(function(k){
		if(GENERATES[k] === dayEl) resourceEl = k;
	  });
	  // 관성: 일간을 극하는 것 = dayEl이 생하는 것의... 
	  // 오행 상극: 木克土, 火克金, 土克水, 金克木, 水克火
	  var KE = {"木":"土","火":"金","土":"水","金":"木","水":"火"};
	  var controllerEl = Object.keys(KE).filter(function(k){ return KE[k] === dayEl; })[0];
	  var controlledBy = KE[dayEl]; // 일간이 극하는 오행 = 재성
	  
	  var yong, hui;
	  if(st.label === "신약(身弱)"){
		yong = resourceEl;  // 인성으로 생조
		hui = dayEl;        // 비겁으로 돕기
	  } else if(st.label === "신강(身强)"){
		yong = outputEl;    // 식상으로 설기
		hui = wealthEl;     // 재성으로 소모
	  } else {
		yong = resourceEl;
		hui = outputEl;
	  }
	  
	  var items = [
		["일간", GAN_KR[dayGan] + "(" + dayGan + ") · " + WUXING_KR[dayEl]],
		["강약", st.label + " · " + Math.round(st.ratio * 100) + "점"],
		["월령", WUXING_KR[LunarUtil.WU_XING_ZHI[pillarsData[1].zhi]] + "(" + pillarsData[1].zhi + ") · " + (st.deukRyeong ? "득령(得令)" : "실령(失令)")],
		["용신 후보", WUXING_KR[yong] + " · " + (st.label === "신약(身弱)" ? "일간을 생조하는 방향" : (st.label === "신강(身强)" ? "과다한 힘을 설기하는 방향" : "균형을 맞추는 방향"))],
		["희신 후보", WUXING_KR[hui]],
		["생(生)", WUXING_KR[resourceEl] + " → 일간 → " + WUXING_KR[outputEl]],
		["극(克)", WUXING_KR[controllerEl] + " → 일간 → " + WUXING_KR[controlledBy]]
	  ];
	  
	  document.getElementById("coreAnalysis").innerHTML = items.map(function(x){
		return '<div class="analysis-item"><span>' + x[0] + '</span><b>' + x[1] + '</b></div>';
	  }).join("");
	}

  function renderDetailTable(bz,pillarsData,hasTime){
    var ds=[["년","year","getYearDiShi","getYearHideGan"],["월","month","getMonthDiShi","getMonthHideGan"],["일","day","getDayDiShi","getDayHideGan"],["시","time","getTimeDiShi","getTimeHideGan"]];
    var rows=ds.map(function(x){
      if(x[1]==="time"&&!hasTime) return '<tr><th>'+x[0]+'주</th><td>—</td><td>시간 미상</td></tr>';
      var hides=bz[x[3]]().map(function(g){return g+"("+GAN_KR[g]+")";}).join(" · ");
      return '<tr><th>'+x[0]+'주</th><td class="hanja-cell">'+hides+'</td><td>'+bz[x[2]]()+'</td></tr>';
    }).join("");
    document.getElementById("detailTable").innerHTML="<tr><th>구분</th><th>지장간</th><th>12운성</th></tr>"+rows;
  }

  function pairMatch(a,b,pairs){
    return pairs.some(function(p){return (p[0]===a&&p[1]===b)||(p[0]===b&&p[1]===a);});
  }
  function renderRelations(pillarsData,hasTime){
    var ps=pillarsData.filter(function(p){return hasTime||p.key!=="time";});
    var z=ps.map(function(p){return p.zhi;}), g=ps.map(function(p){return p.gan;});
    var groups=[];
    for(var i=0;i<z.length;i++) for(var j=i+1;j<z.length;j++){
      if(pairMatch(z[i],z[j],CHUNG)) groups.push(["충",z[i]+z[j], "정면으로 부딪히는 지지 관계"]);
      if(pairMatch(z[i],z[j],PA)) groups.push(["파",z[i]+z[j], "기존 질서가 깨지거나 변동이 생기기 쉬운 관계"]);
      if(pairMatch(z[i],z[j],HAE)) groups.push(["해",z[i]+z[j], "서로 은근히 방해하거나 소모시키는 관계"]);
    }
    var xingPairs=[["寅","巳"],["巳","申"],["丑","戌"],["戌","未"],["丑","未"]];
    xingPairs.forEach(function(pair){
      if(z.indexOf(pair[0])>=0&&z.indexOf(pair[1])>=0)
        groups.push(["형",pair.join(""),"삼형의 일부가 성립하는 관계"]);
    });
    [["辰","辰"],["午","午"],["酉","酉"],["亥","亥"]].forEach(function(pair){
      if(z.filter(function(v){return v===pair[0];}).length>=2)
        groups.push(["형",pair[0]+pair[1],"자형(自刑) 관계"]);
    });
    var html=groups.length?groups.map(function(x){return '<div class="relation-item"><b>'+x[0]+' · '+x[1]+'</b><span>'+x[2]+'</span></div>';}).join(""):'<p class="hap-empty">주요 충·형·파·해가 확인되지 않습니다.</p>';
    document.getElementById("relationResult").innerHTML=html;
  }

	function renderReading(bz, pillarsData, wx, hasTime){
	  var dayGan = pillarsData[2].gan;
	  var dayEl = GAN_WUXING[dayGan];
	  var st = calcStrength(bz, pillarsData, hasTime);
	  
	  // 강약 설명
	  var strengthLine = "월령·통근·천간 지지를 종합한 점수에서 일간을 돕는 힘이 " 
		+ Math.round(st.ratio * 100) + "%입니다. " 
		+ (st.deukRyeong ? "월지의 도움을 받아 " : "월지의 도움은 약하지만 ")
		+ st.label + "으로 판단됩니다.";
	  document.getElementById("strengthLine").textContent = strengthLine;
	  
	  // 십성 카운트
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
	  
	  // 일간 오행 특성
	  var elTraits = {
		"木": "성장과 확장을 추구하며, 곧고 유연한 성정",
		"火": "열정과 표현력이 강하고, 주변을 밝히는 성정",
		"土": "안정과 중재를 중시하며, 포용력이 큰 성정",
		"金": "결단력과 원칙을 중시하며, 예리한 성정",
		"水": "지혜와 유연함이 뛰어나며, 흐르듯 적응하는 성정"
	  };
	  bullets.push(WUXING_KR[dayEl] + " 일간으로 " + elTraits[dayEl] + "을 타고났습니다.");
	  
	  // 강약에 따른 조언
	  if(st.label === "신약(身弱)"){
		bullets.push("일간의 힘이 약한 편이라, 인성(학습·휴식·귀인)과 비겁(동료·협력)의 도움을 받을 때 컨디션이 좋아집니다. 무리한 확장보다 내실을 다지는 전략이 유리합니다.");
	  } else if(st.label === "신강(身强)"){
		bullets.push("일간의 힘이 강한 편이라, 식상(표현·창작)과 재성(실행·성과)으로 에너지를 발산할 때 균형이 잡힙니다. 자기주장이 강해질 수 있으니 주변 의견을 경청하는 것이 좋습니다.");
	  } else {
		bullets.push("일간의 힘이 비교적 균형 잡혀 있어, 상황에 따라 유연하게 대응할 수 있는 명식입니다.");
	  }
	  
	  // 십성별 조언
	  var c;
	  c = count(["식신","상관"]);
	  if(c >= 2) bullets.push("식상이 " + c + "개로 표현력·창의성이 뛰어납니다. 기획, 예술, 콘텐츠, 강의 등 '만들고 말하는' 일에서 강점을 발휘합니다.");
	  else if(c === 1) bullets.push("식상이 하나 있어 필요할 때 아이디어를 짜내는 힘이 있습니다.");
	  
	  c = count(["편재","정재"]);
	  if(c >= 3) bullets.push("재성이 " + c + "개로 많습니다. 돈과 기회가 자주 오지만, " + (st.label === "신약(身弱)" ? "일간이 약해 소화가 버거울 수 있으니 한 번에 하나씩 집중하는 게 유리합니다." : "일간이 강해 기회를 실질적 성과로 연결하는 힘이 좋습니다."));
	  else if(c >= 1) bullets.push("재성이 자리 잡고 있어 실용적 감각과 수치 감각이 있습니다.");
	  
	  c = count(["정관","편관"]);
	  if(c >= 2) bullets.push("관성이 " + c + "개로 규칙과 책임을 중시합니다. 조직이나 시스템 안에서 안정감을 느끼지만, 스트레스 관리가 필요합니다.");
	  else if(c === 1) bullets.push("관성이 하나 있어 맡은 바를 끝까지 해내는 책임감이 있습니다.");
	  
	  c = count(["정인","편인"]);
	  if(c >= 2) bullets.push("인성이 " + c + "개로 배움과 직관이 뛰어납니다. 공부, 연구, 상담 분야에서 강점을 보입니다.");
	  else if(c === 1 && st.label === "신약(身弱)") bullets.push("인성이 하나 있어 일간을 돕지만, 인성운이 들어오는 시기에 더 안정됩니다.");
	  
	  c = count(["비견","겁재"]);
	  if(c >= 2) bullets.push("비겁이 " + c + "개로 자립심과 경쟁심이 강합니다. 협업보다는 독립적인 일에서 강점을 발휘할 수 있습니다.");
	  
	  // 합충형파해 반영
	  var relations = [];
	  var zhis = pillarsData.filter(function(p){ return hasTime || p.key !== "time"; }).map(function(p){ return p.zhi; });
	  CHUNG.forEach(function(pair){
		if(zhis.indexOf(pair[0]) >= 0 && zhis.indexOf(pair[1]) >= 0) relations.push("충(冲)");
	  });
	  if(relations.length > 0){
		bullets.push("원국에 " + relations.join("·") + " 관계가 있어 변화와 이동이 많은 편입니다. 안정을 원한다면 환경을 자주 바꾸지 않는 것이 좋습니다.");
	  }
	  
	  if(bullets.length === 0) bullets.push("특정 오행이나 십성으로 크게 치우치지 않고 비교적 고르게 분포된 사주입니다.");
	  
	  var list = document.getElementById("readingList");
	  list.innerHTML = bullets.map(function(b){ return "<li>" + b + "</li>"; }).join("");
	}

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

    var displayList = flow.daYunList.slice(0, 10);
    if(currentDaYun && displayList.indexOf(currentDaYun) === -1){
      displayList.push(currentDaYun);
      displayList.sort(function(a,b){ return a.getIndex() - b.getIndex(); });
    }
    flow.displayDaYunList = displayList;

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
    var rows = flow.displayDaYunList.map(function(dy){
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
    daewoonSelect.innerHTML = flow.displayDaYunList.map(function(dy){
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
