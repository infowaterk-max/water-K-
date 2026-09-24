#!/usr/bin/env python3
import argparse, hashlib, io, json, os, pathlib, urllib.request
from PIL import Image, ImageOps

RATIOS={"16:9":16/9,"4:5":4/5,"3:2":3/2,"1:1":1.0}

def fetch(url:str)->bytes:
    req=urllib.request.Request(url,headers={"User-Agent":"Shoperation-Template-Factory/1.0"})
    with urllib.request.urlopen(req,timeout=45) as response:
        data=response.read()
        ctype=response.headers.get("content-type","")
        if not data or "image" not in ctype:
            raise RuntimeError(f"MEDIA_FETCH_INVALID:{url}:{ctype}:{len(data)}")
        return data

def crop_ratio(image:Image.Image,ratio:float,focal_x:float=.5,focal_y:float=.5)->Image.Image:
    width,height=image.size
    current=width/height
    if abs(current-ratio)<.002:
        return image
    if current>ratio:
        target_w=int(round(height*ratio))
        max_left=max(0,width-target_w)
        left=int(round(max_left*focal_x))
        left=max(0,min(max_left,left))
        return image.crop((left,0,left+target_w,height))
    target_h=int(round(width/ratio))
    max_top=max(0,height-target_h)
    top=int(round(max_top*focal_y))
    top=max(0,min(max_top,top))
    return image.crop((0,top,width,top+target_h))

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--manifest",required=True)
    parser.add_argument("--output-root",required=True)
    args=parser.parse_args()
    manifest=json.load(open(args.manifest,encoding="utf-8"))
    output_root=pathlib.Path(args.output_root)
    outputs=[]
    for asset in manifest["assets"]:
        if asset.get("state")!="internal-reference":
            continue
        url=asset["referenceSrc"]
        if not url.startswith("https://"):
            raise RuntimeError(f"MEDIA_REFERENCE_HTTPS_REQUIRED:{asset['key']}")
        ratio=RATIOS.get(asset["aspectRatio"])
        if ratio is None:
            raise RuntimeError(f"MEDIA_RATIO_UNSUPPORTED:{asset['key']}:{asset['aspectRatio']}")
        raw=fetch(url)
        image=Image.open(io.BytesIO(raw))
        image=ImageOps.exif_transpose(image).convert("RGB")
        image=crop_ratio(image,ratio,float(asset.get("focalX",.5)),float(asset.get("focalY",.5)))
        target_width=int(asset.get("outputWidth",1200))
        if image.width>target_width:
            target_height=max(1,int(round(target_width/image.width*image.height)))
            image=image.resize((target_width,target_height),Image.Resampling.LANCZOS)
        rel=asset["outputPath"].lstrip("/")
        if not rel.startswith("public/"):
            raise RuntimeError(f"MEDIA_OUTPUT_MUST_BE_PUBLIC:{asset['key']}:{rel}")
        destination=output_root/rel
        destination.parent.mkdir(parents=True,exist_ok=True)
        image.save(destination,"WEBP",quality=int(asset.get("quality",88)),method=6)
        data=destination.read_bytes()
        outputs.append({
            "key":asset["key"],
            "role":asset["role"],
            "outputPath":"/"+rel.removeprefix("public/"),
            "artifactPath":str(destination.relative_to(output_root)),
            "width":image.width,
            "height":image.height,
            "bytes":len(data),
            "sha256":hashlib.sha256(data).hexdigest(),
        })
    evidence={
        "contract":"shoporation.template-factory-finalized-media.v1",
        "templateKey":manifest["templateKey"],
        "templateVersion":manifest["templateVersion"],
        "referenceKey":manifest["referenceKey"],
        "assetCount":len(outputs),
        "assets":outputs,
    }
    if len(outputs)!=manifest["expectedAssetCount"]:
        raise RuntimeError(f"MEDIA_FINALIZATION_COUNT:{len(outputs)}:{manifest['expectedAssetCount']}")
    evidence_path=output_root/"media-finalization-manifest.json"
    evidence_path.write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(evidence,ensure_ascii=False))

if __name__=="__main__":
    main()
