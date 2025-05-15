let model;

async function loadModel() {
  try {
    const modelURL = "./model/model.json";
    const metadataURL = "./model/metadata.json";
    model = await tmImage.load(modelURL, metadataURL);
    console.log("✅ 模型載入成功");
  } catch (error) {
    console.error("❌ 模型載入失敗:", error);
  }
}

loadModel();

async function classifyImage(imageElement) {
  try {
    if (!model) {
      throw new Error("Model not loaded yet");
    }

    const prediction = await model.predict(imageElement);

    if (!prediction || prediction.length === 0) {
      throw new Error("模型沒有傳回任何結果");
    }

    const topResult = prediction.sort((a, b) => b.probability - a.probability)[0];

    // 如果信心度太低，視為辨識失敗
    if (topResult.probability < 0.5) {
      return null;
    }

    console.log("🔍 預測結果:", topResult.className, "信心度:", topResult.probability);
    return topResult.className;
  } catch (error) {
    console.error("❌ 辨識過程錯誤:", error);
    return null;
  }
}

document.getElementById("imageInput").addEventListener("change", async function (e) {
  const file = e.target.files[0];
  const preview = document.getElementById("preview");
  const resultDiv = document.getElementById("result");

  if (!file || !file.type.startsWith("image/")) {
    alert("請上傳圖片檔案");
    return;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = async function () {
    preview.src = img.src;
    preview.style.display = "block";

    const modelResult = await classifyImage(img);

    if (!modelResult) {
      resultDiv.innerHTML = `
        <h2>辨識結果：</h2>
        <p style="color: red; font-weight: bold;">辨識失敗：無法確定車型，請嘗試不同角度或清晰照片。</p>
      `;
      return;
    }

    fetch("data.json")
      .then((res) => res.json())
      .then((data) => {
        let found = null;

        Object.keys(data).forEach((brand) => {
          data[brand].forEach((bike) => {
            if (bike.name === modelResult) {
              found = { ...bike, brand };
            }
          });
        });

        if (found) {
          resultDiv.innerHTML = `
            <h2>辨識結果：</h2>
            <div class="card">
              <img src="images/${found.brand}/${found.name}.jpg" alt="${found.name}">
              <div>
                <h3>${found.name} (${found.brand})</h3>
                <p>${found.desc}</p>
                <p><strong>特色：</strong>${found.features}</p>
              </div>
            </div>
          `;
        } else {
          resultDiv.innerHTML = `
            <h2>辨識結果：</h2>
            <p style="color: red; font-weight: bold;">無法在資料庫中找到「${modelResult}」的資料。</p>
          `;
        }
      })
      .catch((err) => {
        console.error("❌ 讀取資料錯誤:", err);
        resultDiv.innerHTML = `<p style="color: red;">發生錯誤，請稍後再試。</p>`;
      });
  };

  img.src = URL.createObjectURL(file);
});
