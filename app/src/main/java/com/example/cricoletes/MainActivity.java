package com.example.cricoletes;

import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.AppCompatButton;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends AppCompatActivity {
    Button btn1, btn2, btn3, btn4, btn5, btn6, btn7, btnFeminino;
    LinearLayout container;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });
        container = findViewById(R.id.container);

        criarBotoes();
    }

    private void criarBotoes() {

        String[] divisoes = {
                "1ª Divisão",
                "2ª Divisão",
                "3ª Divisão",
                "4ª Divisão",
                "5ª Divisão",
                "6ª Divisão",
                "7ª Divisão",
                "Feminino"
        };

        int[] cores = {
                R.color.div1,
                R.color.div2,
                R.color.div3,
                R.color.div4,
                R.color.div5,
                R.color.div6,
                R.color.div7,
                R.color.feminino
        };

        for (int i = 0; i < divisoes.length; i++) {

            AppCompatButton btn = new AppCompatButton(this);
            btn.setText(divisoes[i]);

            // estilo
            btn.setTextColor(Color.WHITE);
            btn.setTextSize(18);
            btn.setAllCaps(false);

            // fundo padrão
            btn.setBackgroundResource(R.drawable.button_bg);

            btn.getBackground().setTint(getColor(cores[i]));

            // tamanho e margem
            LinearLayout.LayoutParams params =
                    new LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            180
                    );

            params.setMargins(0, 0, 0, 30);
            btn.setLayoutParams(params);

            // clique
            int finalI = i;
            btn.setOnClickListener(v -> abrirDivisao(divisoes[finalI]));

            container.addView(btn);
        }
    }

    private void abrirDivisao(String nomeDivisao) {
        Intent intent = new Intent(this, DivisaoActivity.class);
        intent.putExtra("divisao", nomeDivisao);
        startActivity(intent);
    }
    }
