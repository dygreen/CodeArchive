// 데이터베이스 열기
export const openDB = (
    dbName: string, // 데이터베이스 이름
    storeName: string, // Object Store 이름
    newVersion?: number, // 새로운 Object Store 추가할 경우 사용
): Promise<IDBDatabase> => {
    if (!('indexedDB' in window)) {
        return Promise.reject(
            new Error("This browser doesn't support indexedDB"),
        )
    }
    return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open(dbName, newVersion ?? 1)

        // onsuccess : IndexedDB open 결과를 resolve 함수를 통해 반환
        openRequest.onsuccess = (e) => {
            resolve((e.target as IDBRequest).result)
        }
        // onerror : open 한 데이터베이스의 모든 에러 발생 시 에러 정보와 함께 호출됨
        openRequest.onerror = (e) => {
            reject((e.target as IDBRequest).error)
        }
        // Object Store 생성
        openRequest.onupgradeneeded = (e) => {
            const db = (e.target as IDBRequest).result
            // 동일 이름의 Object Store 가 존재하는지 체크
            // 이미 존재할 경우 onsuccess 호출
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName)
            }
        }
    })
}

// 데이터베이스 삭제
/* 사용 예시
 * nfIndexedDBUtil.deleteDB('testDB')
 * */
export const deleteDB = async (dbName: string) => {
    return new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(dbName)
        deleteRequest.onsuccess = (e) => {
            resolve((e.target as IDBRequest).result)
        }
        deleteRequest.onerror = (e) => {
            reject((e.target as IDBRequest).error)
        }
    })
}

// 현재 데이터베이스 버전 가져오기
const getCurrentDBVersion = (dbName: string): Promise<number> => {
    return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open(dbName)

        openRequest.onsuccess = (e) => {
            const db = (e.target as IDBRequest).result
            const { version } = db
            db.close()
            resolve(version)
        }

        openRequest.onerror = (e) => {
            reject((e.target as IDBRequest).error)
        }
    })
}

// Object Store 추가
// 기존 데이터베이스에 새로운 Object Store 를 추가하기 위해 사용 (버전 up)
export const addObjectStore = async <T>(
    dbName: string,
    newStoreName: string,
    item: T,
    key: IDBValidKey,
) => {
    const currentVersion = (await getCurrentDBVersion(dbName)) as number
    const newVersion = currentVersion + 1

    const db = await openDB(dbName, newStoreName, newVersion)
    return transactionPromise(db, newStoreName, 'readwrite', (store) =>
        store.put(item, key),
    )
}

// transaction 공통 함수
const transactionPromise = (
    db: IDBDatabase,
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest,
): Promise<IDBValidKey> => {
    return new Promise((resolve, reject) => {
        // transaction 을 통해 Object store 에 접근하거나 데이터 요청 가능
        const transaction = db.transaction(storeName, mode)
        const store = transaction.objectStore(storeName)
        const request = callback(store)

        request.onsuccess = (e) => {
            resolve((e.target as IDBRequest).result)
        }
        request.onerror = (e) => {
            reject((e.target as IDBRequest).error)
        }

        transaction.oncomplete = () => {
            db.close()
        }
    })
}

// 데이터 쓰기
/* 사용 예시
* nfIndexedDBUtil.set('testDB', 'testStore', {
    id: 1,
    name: 'nkia',
}, 'init')
* */
export const set = async <T>(
    dbName: string,
    storeName: string,
    item: T,
    key: IDBValidKey,
): Promise<IDBValidKey> => {
    const db = await openDB(dbName, storeName)
    return transactionPromise(db, storeName, 'readwrite', (store) =>
        store.put(item, key),
    )
}

// 특정 데이터 조회
// 해당 데이터의 keyPath 값으로 조회 가능
/* 사용 예시
 * nfIndexedDBUtil.getSpecific('testDB', 'testStore', 'init')
 * */
export const getSpecific = async (
    dbName: string,
    storeName: string,
    key: IDBValidKey,
): Promise<IDBValidKey> => {
    const db = await openDB(dbName, storeName)
    return transactionPromise(db, storeName, 'readonly', (store) =>
        store.get(key),
    )
}

// 전체 데이터 조회
/* 사용 예시
 * nfIndexedDBUtil.getAll('testDB', 'testStore')
 * */
export const getAll = async (
    dbName: string,
    storeName: string,
): Promise<IDBValidKey> => {
    const db = await openDB(dbName, storeName)
    return transactionPromise(db, storeName, 'readonly', (store) =>
        store.getAll(),
    )
}

// 데이터 수정
/* 사용 예시
 * nfIndexedDBUtil.update(
    'testDB',
    'testStore',
    {
        id: 1,
        name: 'nkia222',
    },
    'init',
 )
 * */
export const update = async <T>(
    dbName: string,
    storeName: string,
    item: T,
    key: IDBValidKey,
): Promise<IDBValidKey> => {
    const db = await openDB(dbName, storeName)
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const objStoreRequest = store.get(key)

        objStoreRequest.onsuccess = () => {
            const putRequest = store.put(item, key)
            putRequest.onsuccess = (e) => {
                resolve((e.target as IDBRequest).result)
            }
            putRequest.onerror = (e) => {
                reject((e.target as IDBRequest).error)
            }
        }

        transaction.oncomplete = () => {
            db.close()
        }
    })
}

// 특정 데이터 삭제
/* 사용 예시
 * nfIndexedDBUtil.remove('testDB', 'testStore', 'init')
 * */
export const remove = async (
    dbName: string,
    storeName: string,
    key: IDBValidKey,
): Promise<IDBValidKey> => {
    const db = await openDB(dbName, storeName)
    return transactionPromise(db, storeName, 'readwrite', (store) =>
        store.delete(key),
    )
}

// 전체 데이터 삭제
/* 사용 예시
 * nfIndexedDBUtil.clear('testDB', 'testStore')
 * */
export const clear = async (
    dbName: string,
    storeName: string,
): Promise<IDBValidKey> => {
    const db = await openDB(dbName, storeName)
    return transactionPromise(db, storeName, 'readwrite', (store) =>
        store.clear(),
    )
}

const nfIndexedDBUtil = {
    openDB,
    deleteDB,
    addObjectStore,
    set,
    getSpecific,
    getAll,
    update,
    remove,
    clear,
}

export default nfIndexedDBUtil
