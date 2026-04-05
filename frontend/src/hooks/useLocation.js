// src/hooks/useLocation.js
import { useState, useCallback } from 'react';
import axios from 'axios';

export const useLocation = () => {
    const [currentLocation, setCurrentLocation] = useState('');

    

    const fetchLocation = useCallback(() => {
        if (!navigator.geolocation) {
            alert("Trình duyệt không hỗ trợ định vị GPS");
            return;
        }
        
        setCurrentLocation("📍 Đang quét vị trí của bạn...");
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await axios.get(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                        // 👉 THÊM DẤU PHẨY VÀ OBJECT HEADERS VÀO ĐÂY:
                        {
                            headers: {
                                'Accept-Language': 'vi-VN', // Ưu tiên trả về địa chỉ tiếng Việt
                            }
                        }
                    );
                    if (res.data && res.data.display_name) {
                        setCurrentLocation(res.data.display_name); 
                    } else {
                        setCurrentLocation(`GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
                    }
                } catch (error) {
                    console.error("Lỗi lấy địa chỉ:", error);
                    setCurrentLocation(`GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
                }
            },
            (error) => {
                console.error("Lỗi GPS:", error);
                setCurrentLocation("");
                alert("Không thể lấy vị trí. Vui lòng bật quyền truy cập GPS!");
            }
        );
    }, []);

    // Trả ra các giá trị và hàm để các file khác gọi
    return { currentLocation, fetchLocation, setCurrentLocation };
};