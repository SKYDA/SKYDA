const axios = require('axios')
const platform = 'QQ音乐-Vip'
function get(url, params) {
  return axios({
    url,
    method: 'GET',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    params
  })
}
async function getMusicData(mid, br) {
  try {
    let { code, data } = (
      await get('https://api.xingzhige.com/API/QQmusicVIP/', { mid, format: 'lrc', br })
    ).data
    return code === 0 ? data : {}
  } catch {
    return {}
  }
}
async function getAlbumData(mid) {
  try {
    let { code, data } = (
      await get('https://api.xingzhige.com/API/QQmusicVIP/album.php', { mid })
    ).data
    return code === 0 ? data : {}
  } catch {
    return {}
  }
}
async function customSearch({ type = 'music', page = 1, name, ...params }, callback) {
  const limit = 20
  let url = 'https://api.xingzhige.com/API/QQmusicVIP/'
  if (type === 'album') {
    url += 'album.php'
  }
  try {
    let response = await get(url, { page, limit, name, ...params })
    let { code, data: results } = response.data
    if (code === 0) {
      let data = results.map(callback)
      let total = Math.ceil(response.headers.estimate_sum / limit)
      return { isEnd: page >= total, data }
    }
  } catch (r) {
    console.error(r)
    console.error('请求出错拉!')
  }
  return { isEnd: true, data: [] }
}
async function search(name, page, type) {
  if (type === 'music') {
    return customSearch({ name, page }, (song) => ({
      platform,
      id: song.mid,
      title: song.songname,
      artist: song.name,
      artwork: song.cover,
      album: song.album
    }))
  } else if (type === 'album') {
    return customSearch({ name, page, type: 'album', data: 'song_list' }, (album) => ({
      platform,
      id: album.mid,
      title: album.name,
      artist: album.singer.name,
      artwork: album.cover,
      date: album.public_time,
      musicList: album.song_list.map((song) => ({
        platform,
        id: song.mid,
        title: song.songname,
        artist: song.name,
        artwork: song.cover,
        album: song.album
      })),
      description: '正在加载...'
    }))
  }
}
async function getMediaSource(music, br) {
  try {
    const BREmun = { super: 14, high: 11, standard: 8, low: 6 }
    let data = await getMusicData(music.id, BREmun[br])
    if (data.src !== undefined) {
      return { url: data.src }
    }
  } catch {
    console.error('请求出错拉!')
  }
}
async function getLyric(music) {
  let data = await getMusicData(music.id)
  if (data.lrc.content !== undefined) {
    return { rawLrc: data.lrc.content }
  }
}
async function getAlbumInfo(album) {
  let data = await getAlbumData(album.id)
  return {
    isEnd: true,
    musicList: data.songlist.map((song) => ({
      platform,
      id: song.mid,
      title: song.songname,
      artist: song.name,
      artwork: song.cover,
      album: song.album
    })),
    albumItem: { ...album, description: data.desc }
  }
}
async function importMusicSheet(urlLike) {
  //
  let id;
  if (!id) {
    id = (urlLike.match(
      /https?:\/\/i\.y\.qq\.com\/n2\/m\/share\/details\/taoge\.html\?.*id=([0-9]+)/
    ) || [])[1];
  }
  if (!id) {
    id = (urlLike.match(/https?:\/\/y\.qq\.com\/n\/ryqq\/playlist\/([0-9]+)/) ||
      [])[1];
  }
  if (!id) {
    id = (urlLike.match(/^(\d+)$/) || [])[1];
  }
  if (!id) {
    return;
  }

  const result = (
    await axios({
      url: `http://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&utf8=1&disstid=${id}&loginUin=0`,
      headers: { Referer: "https://y.qq.com/n/yqq/playlist", Cookie: "uin=" },
      method: "get",
      xsrfCookieName: "XSRF-TOKEN",
      withCredentials: true,
    })
  ).data;
  const res = JSON.parse(
    result.replace(/callback\(|MusicJsonCallback\(|jsonCallback\(|\)$/g, "")
  );
  return res.cdlist[0].songlist.map(formatMusicItem);
}

module.exports = {
  platform,
  version: '1.2.0',
  appVersion: '>0.0',
  defaultSearchType: 'music',
  srcUrl:
    'https://ghproxy.com/https://github.com/Yingyya/MusicFreePlugin/raw/main/QQ音乐.js',
  search,
  getMediaSource,
  getLyric,
  getAlbumInfo,
  importMusicSheet,
}
